import time
import enum
import logging
from functools import wraps
from backend.config import settings

logger = logging.getLogger("miron_cb")

class CircuitState(enum.Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    """
    Generic Circuit Breaker implementation.
    Wraps external calls (DB, Redis, API) to fail fast when dependency is down.
    """
    def __init__(self, name: str, threshold: int = 5, recovery_timeout: int = 30):
        self.name = name
        self.threshold = threshold
        self.recovery_timeout = recovery_timeout
        
        self.state = CircuitState.CLOSED
        self.failures = 0
        self.last_failure_time = 0
        self.successes = 0 # For half-open
        
    def allow_request(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
            
        if self.state == CircuitState.OPEN:
            now = time.time()
            if now - self.last_failure_time > self.recovery_timeout:
                logger.warning(f"Circuit {self.name} switching to HALF-OPEN (Testing Recovery)")
                self.state = CircuitState.HALF_OPEN
                self.failures = 0 # Reset for strict check
                return True
            return False
            
        if self.state == CircuitState.HALF_OPEN:
            # Allow limited requests (e.g. 1 concurrent)
            # Simple implementation: Allow all, but 1 failure trips back to OPEN immediately
            return True
            
        return False
        
    def record_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.successes += 1
            if self.successes >= settings.CB_HALF_OPEN_MAX_REQUESTS:
                logger.info(f"Circuit {self.name} recovered. Switching to CLOSED.")
                self.state = CircuitState.CLOSED
                self.failures = 0
                self.successes = 0
        elif self.state == CircuitState.CLOSED:
            self.failures = 0 # Decay failures on success

    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        
        if self.state == CircuitState.HALF_OPEN:
            logger.error(f"Circuit {self.name} failed in HALF-OPEN. Re-opening.")
            self.state = CircuitState.OPEN
            
        elif self.failures >= self.threshold:
            logger.critical(f"Circuit {self.name} OPENED due to {self.failures} failures.")
            self.state = CircuitState.OPEN

    def call(self, func, *args, **kwargs):
        if not self.allow_request():
            raise RuntimeError(f"Circuit {self.name} is OPEN")
            
        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise e

# Singletons
db_circuit = CircuitBreaker("db_circuit", threshold=settings.CB_FAILURE_THRESHOLD, recovery_timeout=settings.CB_RECOVERY_TIMEOUT)
redis_circuit = CircuitBreaker("redis_circuit", threshold=settings.CB_FAILURE_THRESHOLD, recovery_timeout=settings.CB_RECOVERY_TIMEOUT)

def circuit_protected(circuit: CircuitBreaker):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return circuit.call(func, *args, **kwargs)
        return wrapper
    return decorator
