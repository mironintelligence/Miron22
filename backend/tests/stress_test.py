from locust import HttpUser, task, between
import random

class MironUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login to get token
        self.email = f"user_{random.randint(1000,9999)}@test.com"
        # Assuming these users exist or we use a fixed user for stress test
        # For simplicity, let's use a fixed test user
        self.email = "advanced_user@test.com"
        self.password = "StrongPassword123!"
        
        # Get CSRF
        res = self.client.get("/")
        csrf_token = res.cookies.get("csrf_token")
        self.headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
        
        # Login
        with self.client.post("/api/auth/login", json={"email": self.email, "password": self.password}, headers=self.headers, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                self.refresh_token = response.cookies.get("refresh_token")
            else:
                response.failure(f"Login failed: {response.text}")

    @task(3)
    def view_pricing(self):
        self.client.get("/api/pricing/config", headers=self.headers)

    @task(2)
    def calculate_price(self):
        self.client.post("/api/pricing/calculate", json={"count": random.randint(1, 10)}, headers=self.headers)

    @task(1)
    def refresh_token(self):
        # Refresh logic
        if hasattr(self, 'refresh_token'):
            self.client.post("/api/auth/refresh", cookies={"refresh_token": self.refresh_token}, headers=self.headers)

    @task(1)
    def health_check(self):
        self.client.get("/health")
