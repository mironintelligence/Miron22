import os
import sys
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

sys.modules["pdfplumber"] = MagicMock()
sys.modules["docx"] = MagicMock()

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test_jwt_secret_32_bytes_long_123456"
os.environ["DATA_HASH_KEY"] = "test_hash_key"

from cryptography.fernet import Fernet

os.environ["DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

from main import app

client = TestClient(app, base_url="https://testserver")


def test_public_legal_documents_list():
    r = client.get("/api/legal/documents")
    assert r.status_code == 200
    body = r.json()
    assert "documents" in body


def test_register_rejects_without_terms_privacy():
    r = client.post(
        "/api/auth/register",
        json={
            "email": "legal_reject@test.com",
            "password": "StrongPassword123!",
            "firstName": "A",
            "lastName": "B",
            "accepted_terms_and_privacy": False,
        },
    )
    assert r.status_code == 400


def test_register_accepts_with_terms_privacy_flag():
    import time

    email = f"legal_ok_{int(time.time())}@test.com"
    r = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "StrongPassword123!",
            "firstName": "A",
            "lastName": "B",
            "accepted_terms_and_privacy": True,
        },
    )
    assert r.status_code == 200
