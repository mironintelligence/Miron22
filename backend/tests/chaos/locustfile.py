import time
import random
from locust import HttpUser, task, between, events
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("locust_stress")

class MironUser(HttpUser):
    wait_time = between(1, 3) # Realistic user wait time
    
    def on_start(self):
        """User Login Flow"""
        self.email = f"user_{random.randint(1000, 9999)}@stress.test"
        self.password = "StressTest123!"
        
        # 1. Get CSRF Token (Simulate Frontend Load)
        with self.client.get("/", catch_response=True) as res:
            if res.status_code == 200:
                self.csrf_token = res.cookies.get("csrf_token")
                self.headers = {"X-CSRF-Token": self.csrf_token} if self.csrf_token else {}
            else:
                res.failure("Frontend Load Failed")
                self.headers = {}
        
        # 2. Login (or Register if new)
        # Try Login first
        with self.client.post("/api/auth/login", json={"email": self.email, "password": self.password}, headers=self.headers, catch_response=True) as res:
            if res.status_code == 200:
                self.refresh_token = res.cookies.get("refresh_token")
            elif res.status_code == 401:
                # Register if user doesn't exist
                reg_res = self.client.post("/api/auth/register", json={
                    "email": self.email, 
                    "password": self.password,
                    "firstName": "Stress",
                    "lastName": "User"
                }, headers=self.headers)
                if reg_res.status_code == 200:
                    # Login again
                    self.client.post("/api/auth/login", json={"email": self.email, "password": self.password}, headers=self.headers)
            else:
                res.failure(f"Auth Failed: {res.status_code}")

    @task(5)
    def view_dashboard(self):
        """Simulate Dashboard Load (Read Heavy)"""
        self.client.get("/api/pricing/config", headers=self.headers)
        self.client.get("/health", headers=self.headers)

    @task(3)
    def calculate_pricing(self):
        """Simulate Calculation (CPU Heavy)"""
        count = random.randint(1, 50)
        self.client.post("/api/pricing/calculate", json={"count": count}, headers=self.headers)

    @task(1)
    def refresh_session(self):
        """Simulate Token Refresh (Auth Heavy)"""
        if hasattr(self, 'refresh_token'):
            self.client.post("/api/auth/refresh", cookies={"refresh_token": self.refresh_token}, headers=self.headers)

    @task(1)
    def admin_action(self):
        """Simulate Admin Action (Write Heavy, Rate Limited)"""
        # Only if user is admin (random chance or specific user)
        # Here we just try an endpoint that might be protected
        self.client.get("/admin/stats", headers=self.headers)

# Custom Event Listeners for Reporting
@events.request.add_listener
def record_request(request_type, name, response_time, response_length, exception, **kwargs):
    if exception:
        logger.error(f"Request Failed: {name} - {exception}")
    if response_time > 1000:
        logger.warning(f"Slow Request: {name} took {response_time}ms")
