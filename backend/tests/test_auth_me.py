import os
import sys
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

sys.modules["pdfplumber"] = MagicMock()
sys.modules["docx"] = MagicMock()
sys.modules["openai"] = MagicMock()

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test_jwt_secret_32_bytes_long_123456"
os.environ["DATA_HASH_KEY"] = "test_hash_key"

from cryptography.fernet import Fernet

os.environ["DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

from main import app
from stores.pg_users_store import create_user
from security import hash_password

client = TestClient(app, base_url="https://testserver")


@pytest.fixture
def user_token():
    create_user(
        {
            "email": "admin1@example.com",
            "firstName": "A",
            "lastName": "B",
            "hashed_password": hash_password("StrongPassword123!"),
            "role": "admin",
            "is_active": True,
            "is_verified": True,
        }
    )
    res = client.post("/api/auth/login", json={"email": "admin1@example.com", "password": "StrongPassword123!"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_auth_me(user_token):
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["user"]["email"] == "admin1@example.com"
    assert body["user"]["role"] == "admin"

