import os
import logging
import asyncpg
import asyncio
import json
import random
from typing import Optional, List, Dict, Any, Callable, TypeVar
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("miron_db_async")

T = TypeVar("T")

class DBConnectionError(Exception):
    """Raised when DB connection is lost/unreachable after retries."""
    pass

class AsyncDatabase:
    def __init__(self):
        self._write_pool: Optional[asyncpg.Pool] = None
        self._read_pool: Optional[asyncpg.Pool] = None
        self.write_url = os.getenv("DATABASE_URL")
        self._keepalive_task: Optional[asyncio.Task] = None
        self._health_log_path = "backend/diagnostics/db_health_log.json"
        
        # Ensure diagnostics dir exists
        os.makedirs(os.path.dirname(self._health_log_path), exist_ok=True)
        if not os.path.exists(self._health_log_path):
            self._write_health_log({"events": []})

    def _write_health_log(self, data: Dict):
        try:
            with open(self._health_log_path, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write health log: {e}")

    def _log_event(self, event_type: str, details: str):
        try:
            if os.path.exists(self._health_log_path):
                with open(self._health_log_path, "r") as f:
                    data = json.load(f)
            else:
                data = {"events": []}
            
            entry = {
                "timestamp": datetime.now().isoformat(),
                "type": event_type,
                "details": details
            }
            data["events"].append(entry)
            # Keep log size manageable
            if len(data["events"]) > 1000:
                data["events"] = data["events"][-1000:]
                
            self._write_health_log(data)
        except Exception as e:
            logger.error(f"Failed to log event: {e}")

    async def init_pools(self):
        """Initialize asyncpg pools with hardened settings"""
        try:
            # Write Pool (Primary)
            # Hardened settings as requested
            self._write_pool = await asyncpg.create_pool(
                self.write_url,
                min_size=1,  # Decreased min_size
                max_size=3,  # Decreased max_size
                max_inactive_connection_lifetime=300,
                timeout=60.0,
                command_timeout=60.0,
                statement_cache_size=0,
                ssl="require"
            )
            
            # Read Pool (Replica or Primary)
            read_url = os.getenv("DB_REPLICA_URL", self.write_url)
            self._read_pool = await asyncpg.create_pool(
                read_url,
                min_size=1,  # Decreased min_size
                max_size=3,  # Decreased max_size
                max_inactive_connection_lifetime=300,
                timeout=60.0,
                command_timeout=60.0,
                statement_cache_size=0,
                ssl="require"
            )
            logger.info("Async DB Pools initialized (Hardened Mode)")
            
            # Start Keepalive
            if not self._keepalive_task:
                self._keepalive_task = asyncio.create_task(self._keepalive_loop())
                
        except Exception as e:
            logger.error(f"Failed to init DB pools: {e}")
            self._log_event("INIT_FAILURE", str(e))
            raise e

    async def close_pools(self):
        if self._keepalive_task:
            self._keepalive_task.cancel()
            try:
                await self._keepalive_task
            except asyncio.CancelledError:
                pass
                
        if self._write_pool:
            await self._write_pool.close()
        if self._read_pool:
            await self._read_pool.close()
        logger.info("Async DB Pools closed")

    async def _keepalive_loop(self):
        """Background task to keep connections alive"""
        logger.info("DB Keepalive task started")
        while True:
            try:
                await asyncio.sleep(30)
                # Ping write pool
                if self._write_pool:
                    async with self._write_pool.acquire() as conn:
                        await conn.execute("SELECT 1")
                # Ping read pool if different
                if self._read_pool and self._read_pool is not self._write_pool:
                     async with self._read_pool.acquire() as conn:
                        await conn.execute("SELECT 1")
            except Exception as e:
                logger.warning(f"Keepalive ping failed: {e}")
                # Don't crash the loop, just log and retry
                await asyncio.sleep(5)

    async def _reset_pools(self):
        """Force reset of connection pools"""
        logger.warning("🔄 Resetting DB Pools...")
        self._log_event("POOL_RESET", "Initiating pool reset")
        try:
            await self.close_pools()
        except Exception as e:
            logger.error(f"Error closing pools during reset: {e}")
            
        await asyncio.sleep(1) # Cool down
        
        try:
            await self.init_pools()
            logger.info("✅ Pools successfully reset")
            self._log_event("POOL_RESET_SUCCESS", "Pools re-initialized")
        except Exception as e:
            logger.error(f"❌ Failed to reset pools: {e}")
            self._log_event("POOL_RESET_FAILURE", str(e))
            raise

    async def safe_db_execute(self, operation: Callable[..., Any], *args, **kwargs) -> Any:
        """
        Wrapper for DB operations with retry logic and auto-recovery.
        """
        max_retries = 10
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                return await operation(*args, **kwargs)
            except (asyncpg.ConnectionDoesNotExistError, 
                    asyncpg.InterfaceError, 
                    asyncpg.PostgresConnectionError, 
                    OSError) as e:
                
                logger.warning(f"⚠️ DB Error (Attempt {attempt+1}/{max_retries}): {e}")
                self._log_event("CONNECTION_ERROR", f"Attempt {attempt+1}: {str(e)}")
                
                # If it's a connection error, try to reset pools
                try:
                    await self._reset_pools()
                except Exception as reset_err:
                    logger.error(f"Pool reset failed: {reset_err}")
                
                # Exponential backoff with jitter
                delay = min(30, base_delay * (2 ** attempt)) + (random.random() * 0.5)
                logger.info(f"Sleeping {delay:.2f}s before retry...")
                await asyncio.sleep(delay)
                
            except Exception as e:
                # Other errors (SQL syntax, constraints) - log and re-raise immediately
                # UNLESS it's a "connection closed" error wrapped in a generic Exception
                if "connection" in str(e).lower() or "closed" in str(e).lower():
                     logger.warning(f"⚠️ Generic DB Error (Likely Connection) (Attempt {attempt+1}/{max_retries}): {e}")
                     self._log_event("GENERIC_CONN_ERROR", str(e))
                     try:
                        await self._reset_pools()
                     except: pass
                     delay = min(30, base_delay * (2 ** attempt))
                     await asyncio.sleep(delay)
                else:
                    logger.error(f"❌ SQL/Application Error: {e}")
                    raise e
                    
        # If we exhausted retries
        err_msg = f"🔥 CRITICAL: DB Operation failed after {max_retries} attempts."
        logger.error(err_msg)
        self._log_event("CRITICAL_FAILURE", err_msg)
        raise DBConnectionError(err_msg)

    async def fetch_one(self, query: str, *args, timeout: float = 60.0):
        async def _op():
            if not self._read_pool: await self.init_pools()
            async with self._read_pool.acquire() as conn:
                return await conn.fetchrow(query, *args, timeout=timeout)
        return await self.safe_db_execute(_op)

    async def fetch_all(self, query: str, *args, timeout: float = 60.0):
        async def _op():
            if not self._read_pool: await self.init_pools()
            async with self._read_pool.acquire() as conn:
                return await conn.fetch(query, *args, timeout=timeout)
        return await self.safe_db_execute(_op)

    async def execute(self, query: str, *args, timeout: float = 60.0):
        async def _op():
            if not self._write_pool: await self.init_pools()
            async with self._write_pool.acquire() as conn:
                return await conn.execute(query, *args, timeout=timeout)
        return await self.safe_db_execute(_op)
            
    async def execute_many(self, query: str, args_list: list, timeout: float = 60.0):
        async def _op():
            if not self._write_pool: await self.init_pools()
            async with self._write_pool.acquire() as conn:
                return await conn.executemany(query, args_list, timeout=timeout)
        return await self.safe_db_execute(_op)

db = AsyncDatabase()
