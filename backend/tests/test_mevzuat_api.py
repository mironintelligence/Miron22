import json
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import mevzuat_search


@pytest.fixture
def client(monkeypatch):
    app = FastAPI()
    app.include_router(mevzuat_search.router)

    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = json.dumps(
        {
            "madde_uygunlugu": "Uygun",
            "yanlis_madde_riski": "Düşük",
            "ilgili_maddeler": [{"kanun": "TBK", "madde": "344", "gerekce": "Kira artışı."}],
            "capraz_atiflar": ["HMK 119"],
            "hiyerarsi_catisma": [],
            "riskler": ["Delil eksikliği riski."],
            "gerekce": "Kısa gerekçe.",
        },
        ensure_ascii=False,
    )
    mock_client.chat.completions.create.return_value = mock_completion
    monkeypatch.setattr(mevzuat_search, "get_openai_client", lambda: mock_client)

    from services import search as search_mod
    monkeypatch.setattr(
        search_mod.search_engine,
        "search",
        lambda query, year=None, court=None, chamber=None, limit=50: {
            "query": query,
            "results": [
                {
                    "id": "1",
                    "decision_number": "2023/1 K.",
                    "case_number": "2023/1 E.",
                    "court": "Yargıtay",
                    "chamber": "3. HD",
                    "summary": "Özet",
                }
            ],
        },
    )

    return TestClient(app, base_url="https://testserver")


def test_mevzuat_search_ok(client):
    res = client.post(
        "/api/mevzuat/search",
        json={"query": "kira artışı", "law": "TBK", "article": "344", "article_text": "..."},
    )
    assert res.status_code == 200
    body = res.json()
    assert "analysis" in body
    assert "precedents" in body
    assert body.get("query") == "kira artışı"
    assert isinstance(body.get("results"), list)
    assert len(body["precedents"]) == 1


def test_mevzuat_search_validation(client):
    res = client.post("/api/mevzuat/search", json={"query": " "})
    assert res.status_code == 400


def test_mevzuat_search_without_openai_returns_fallback(monkeypatch):
    app = FastAPI()
    app.include_router(mevzuat_search.router)
    monkeypatch.setattr(mevzuat_search, "get_openai_client", lambda: None)
    from services import search as search_mod

    monkeypatch.setattr(
        search_mod.search_engine,
        "search",
        lambda query, year=None, court=None, chamber=None, limit=50: {"query": query, "results": []},
    )
    tc = TestClient(app, base_url="https://testserver")
    res = tc.post("/api/mevzuat/search", json={"query": "kira tahliye"})
    assert res.status_code == 200
    body = res.json()
    assert body.get("mode") == "precedents_only_no_llm"
    assert "analysis" in body
    assert body.get("query") == "kira tahliye"
    assert isinstance(body.get("results"), list)
    assert body["analysis"].get("madde_uygunlugu")
