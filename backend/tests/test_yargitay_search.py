import pytest
from unittest.mock import MagicMock, patch
import sys
import os

# Mock openai
sys.modules["openai"] = MagicMock()

from backend.services.search import YargitaySearchEngine
from backend.yargitay_search import router, search_decisions
from fastapi.testclient import TestClient
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)
client = TestClient(app)

@pytest.fixture
def mock_db_cursor():
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    
    # Mock context manager
    mock_conn.__enter__.return_value = mock_conn
    mock_conn.__exit__.return_value = None
    mock_cur.__enter__.return_value = mock_cur
    mock_cur.__exit__.return_value = None
    
    return mock_conn, mock_cur

def test_search_engine_logic(mock_db_cursor):
    conn, cur = mock_db_cursor
    
    # Mock data
    mock_semantic_rows = [
        {
            "id": "1", "clean_text": "text1", "summary": "sum1", "outcome": "ONAMA", 
            "decision_number": "K1", "case_number": "E1", "court": "Y", "chamber": "C1", 
            "decision_date": "2023-01-01", "semantic_score": 0.9
        }
    ]
    mock_keyword_rows = [
        {
            "id": "1", "clean_text": "text1", "summary": "sum1", "outcome": "ONAMA", 
            "decision_number": "K1", "case_number": "E1", "court": "Y", "chamber": "C1", 
            "decision_date": "2023-01-01", "keyword_rank": 0.5
        },
        {
            "id": "2", "clean_text": "text2", "summary": "sum2", "outcome": "BOZMA", 
            "decision_number": "K2", "case_number": "E2", "court": "Y", "chamber": "C2", 
            "decision_date": "2023-01-02", "keyword_rank": 0.8
        }
    ]
    
    cur.fetchall.side_effect = [mock_semantic_rows, mock_keyword_rows]
    
    engine = YargitaySearchEngine(db_url="postgres://fake")
    
    with patch("psycopg2.connect", return_value=conn):
        with patch("backend.services.search.get_embedding", return_value=[0.1]*3072):
            results = engine.search("query")
    
    assert len(results["results"]) == 2
    
    # Check scoring for ID 1
    # 0.9 * 0.65 + 0.5 * 0.35 = 0.585 + 0.175 = 0.76
    res1 = next(r for r in results["results"] if r["id"] == "1")
    assert abs(res1["final_score"] - 0.76) < 0.001
    
    # Check scoring for ID 2 (Semantic 0 implicit, Keyword 0.8)
    # 0 * 0.65 + 0.8 * 0.35 = 0.28
    res2 = next(r for r in results["results"] if r["id"] == "2")
    assert abs(res2["final_score"] - 0.28) < 0.001

def test_api_endpoint_mock_db():
    # Test API when DB is NOT connected (fallback to mock)
    # This simulates the current sandbox environment
    
    # Force db_url to None for engine used by router?
    # Actually router imports search_engine instance.
    # We can patch the search method of that instance.
    
    with patch("backend.services.search.search_engine.search") as mock_search:
        mock_search.return_value = {
            "query": "test",
            "results": [
                {
                    "id": "mock-1",
                    "decision_number": "2023/1452 K.",
                    "final_score": 0.95
                }
            ]
        }
        
        response = client.get(
            "/api/search/decisions?q=test",
            headers={"Authorization": "Bearer demo"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["id"] == "mock-1"

def test_api_validation():
    response = client.get(
        "/api/search/decisions?q=",
        headers={"Authorization": "Bearer demo"}
    )
    assert response.status_code == 400

