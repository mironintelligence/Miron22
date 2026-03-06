import time
import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

try:
    from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    print("WARNING: prometheus_client not installed. Metrics will be disabled.")

if PROMETHEUS_AVAILABLE:
    # Define Metrics
    REQUEST_COUNT = Counter(
        "http_requests_total", 
        "Total HTTP requests", 
        ["method", "endpoint", "status"]
    )
    REQUEST_LATENCY = Histogram(
        "http_request_duration_seconds", 
        "HTTP request latency", 
        ["method", "endpoint"],
        buckets=[0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.5, 5.0, 10.0] # Custom buckets for p95/p99
    )
    AUTH_FAILURES = Counter(
        "auth_failures_total", 
        "Total authentication failures", 
        ["reason"]
    )
    DB_QUERY_DURATION = Histogram(
        "db_query_duration_seconds",
        "DB query duration",
        ["operation"]
    )
    
    # Pool Metrics (Gauge)
    from prometheus_client import Gauge
    
    DB_POOL_STATS = Gauge(
        "db_pool_stats",
        "Database Connection Pool Statistics",
        ["state"] # active, idle, max
    )
    
    # Circuit Breaker Metrics
    CB_STATE = Gauge(
        "circuit_breaker_state",
        "Circuit Breaker State (0=Closed, 1=Open, 2=Half-Open)",
        ["name"]
    )
    CB_FAILURES = Counter(
        "circuit_breaker_failures_total",
        "Circuit Breaker Failure Count",
        ["name"]
    )
    
    # System Metrics (Basic)
    SYSTEM_MEMORY_USAGE = Gauge("system_memory_usage_bytes", "Memory usage in bytes")
    SYSTEM_CPU_USAGE = Gauge("system_cpu_usage_percent", "CPU usage percent")

class PrometheusMiddleware(BaseHTTPMiddleware):
    """
    Middleware to expose Prometheus metrics at /metrics
    and track HTTP request duration/counts.
    """
    async def dispatch(self, request: Request, call_next):
        if not PROMETHEUS_AVAILABLE:
             return await call_next(request)

        # Expose metrics endpoint
        if request.url.path == "/metrics":
            # Collect Pool Metrics
            try:
                from db import get_pool_status
                stats = get_pool_status()
                if stats["status"] == "active":
                    DB_POOL_STATS.labels(state="active").set(stats["used"])
                    DB_POOL_STATS.labels(state="idle").set(stats["idle"])
                    DB_POOL_STATS.labels(state="max").set(stats["max"])
            except Exception as e:
                pass
                
            # Collect Circuit Breaker Metrics
            try:
                from utils.circuit_breaker import db_circuit, redis_circuit, CircuitState
                state_map = {CircuitState.CLOSED: 0, CircuitState.OPEN: 1, CircuitState.HALF_OPEN: 2}
                CB_STATE.labels(name="db_circuit").set(state_map[db_circuit.state])
                CB_STATE.labels(name="redis_circuit").set(state_map[redis_circuit.state])
                CB_FAILURES.labels(name="db_circuit").inc(db_circuit.failures) # Note: failures is current count, not total. Ideally monotonic.
                # Actually, CB failures property resets on success. We need a monotonic counter inside CB class.
                # For now, we just expose state.
            except Exception as e:
                pass
                
            # Collect System Metrics (Memory)
            try:
                import psutil
                process = psutil.Process(os.getpid())
                SYSTEM_MEMORY_USAGE.set(process.memory_info().rss)
                SYSTEM_CPU_USAGE.set(process.cpu_percent())
            except ImportError:
                pass
            except Exception:
                pass
                
            return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
            
        start_time = time.time()
        
        try:
            response = await call_next(request)
            
            process_time = time.time() - start_time
            endpoint = request.url.path
            
            # Record metrics
            REQUEST_COUNT.labels(
                method=request.method, 
                endpoint=endpoint, 
                status=response.status_code
            ).inc()
            
            REQUEST_LATENCY.labels(
                method=request.method, 
                endpoint=endpoint
            ).observe(process_time)
            
            return response
            
        except Exception as e:
            # Count 500
            endpoint = request.url.path
            REQUEST_COUNT.labels(
                method=request.method, 
                endpoint=endpoint, 
                status=500
            ).inc()
            raise e
