import json
import logging
from typing import Any, Optional, Callable, Dict
import functools
import redis
from config import settings

logger = logging.getLogger("miron_cache")

class RedisCache:
    def __init__(self):
        self.client = None
        self.enabled = False
        
        # Parse Cluster Nodes if provided (Simple Redis for now, Cluster requires redis-py-cluster or redis.RedisCluster)
        # For this implementation we support single node or robust fallback.
        # "host:port,host2:port2"
        
        if settings.REDIS_CLUSTER_NODES:
            try:
                # If we had redis-py-cluster installed:
                # from redis.cluster import RedisCluster
                # nodes = [{"host": n.split(":")[0], "port": int(n.split(":")[1])} for n in settings.REDIS_CLUSTER_NODES.split(",")]
                # self.client = RedisCluster(startup_nodes=nodes, decode_responses=True)
                
                # Fallback to single node first addr for standard redis lib if cluster lib missing
                first_node = settings.REDIS_CLUSTER_NODES.split(",")[0]
                host, port = first_node.split(":")
                self.client = redis.Redis(host=host, port=int(port), decode_responses=True)
                self.enabled = True
                logger.info(f"Redis Cache connected to {first_node}")
            except Exception as e:
                logger.error(f"Redis Cluster Init Failed: {e}")
        else:
            # Try standard REDIS_URL
            url = os.getenv("REDIS_URL")
            if url:
                try:
                    self.client = redis.from_url(url, decode_responses=True)
                    self.enabled = True
                    logger.info("Redis Cache connected via URL")
                except Exception as e:
                    logger.error(f"Redis URL Connection Failed: {e}")

    def get(self, key: str) -> Optional[Any]:
        if not self.enabled: return None
        try:
            val = self.client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.warning(f"Cache GET failed: {e}")
        return None

    def set(self, key: str, value: Any, ttl: int = 300):
        if not self.enabled: return
        try:
            self.client.setex(key, ttl, json.dumps(value))
        except Exception as e:
            logger.warning(f"Cache SET failed: {e}")

    def cached(self, ttl: int = 300, key_builder: Callable = None):
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                if not self.enabled:
                    return func(*args, **kwargs)
                
                # Build key
                if key_builder:
                    cache_key = key_builder(*args, **kwargs)
                else:
                    # Simple key gen
                    cache_key = f"cache:{func.__module__}:{func.__name__}:{str(args)}:{str(kwargs)}"
                
                # Check cache
                cached_val = self.get(cache_key)
                if cached_val is not None:
                    return cached_val
                
                # Call
                result = func(*args, **kwargs)
                
                # Save
                if result is not None:
                    self.set(cache_key, result, ttl)
                    
                return result
            return wrapper
        return decorator

# Global Cache Instance
cache = RedisCache()
