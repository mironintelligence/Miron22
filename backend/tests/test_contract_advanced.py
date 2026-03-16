from contextlib import contextmanager
from unittest.mock import MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

import routes.contract_routes as contract_routes


@contextmanager
def _fake_db_cursor():
    cur = MagicMock()
    cur.fetchone.return_value = {"id": 1}
    cur.fetchall.return_value = []
    yield cur


def _mock_openai_json(payload: str):
    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = payload
    mock_client.chat.completions.create.return_value = mock_completion
    return mock_client


def test_contract_analyze_detailed(monkeypatch):
    app = FastAPI()
    app.include_router(contract_routes.router)
    app.dependency_overrides[contract_routes.get_current_user] = lambda: {"id": "u1"}

    analysis_json = """{
      "genel_ozet": "ok",
      "risk_puani": 40,
      "risk_seviyesi": "orta",
      "guclu_yonler": ["a"],
      "zayif_yonler": ["b"],
      "gelecek_riskleri": ["c"],
      "eksik_maddeler": ["d"],
      "uyum_kontrolleri": {"tbk":["x"],"kvkk":[],"ticaret":[],"is_hukuku":[]},
      "maddeler": [{"baslik":"m1","risk":"orta","gerekce":"g","onerilen_duzenleme":"o"}],
      "oneriler": ["e"],
      "eksik_bilgi": []
    }"""
    monkeypatch.setattr(contract_routes, "get_openai_client", lambda: _mock_openai_json(analysis_json))
    monkeypatch.setattr(contract_routes, "get_db_cursor", _fake_db_cursor)

    c = TestClient(app, base_url="https://testserver")
    res = c.post("/api/contracts/analyze", json={"title": "t", "content": "c"})
    assert res.status_code == 200
    body = res.json()
    assert body["analysis"]["risk_puani"] == 40


def test_contract_compare(monkeypatch):
    app = FastAPI()
    app.include_router(contract_routes.router)
    app.dependency_overrides[contract_routes.get_current_user] = lambda: {"id": "u1"}

    compare_json = """{
      "ozet":"degisti",
      "degisiklikler":[{"baslik":"b","degisiklik":"d","risk_etkisi":"degismedi","onerilen_aksiyon":"a"}],
      "risk_karsilastirma":{"a_risk_puani":10,"b_risk_puani":12,"degisim":"artti"},
      "notlar":[]
    }"""
    monkeypatch.setattr(contract_routes, "get_openai_client", lambda: _mock_openai_json(compare_json))
    c = TestClient(app, base_url="https://testserver")
    res = c.post(
        "/api/contracts/compare",
        json={"left_content": "a", "right_content": "b", "left_title": "A", "right_title": "B"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["compare"]["ozet"] == "degisti"


def test_contract_clause_generate(monkeypatch):
    app = FastAPI()
    app.include_router(contract_routes.router)
    app.dependency_overrides[contract_routes.get_current_user] = lambda: {"id": "u1"}

    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = "MADDE"
    mock_client.chat.completions.create.return_value = mock_completion
    monkeypatch.setattr(contract_routes, "get_openai_client", lambda: mock_client)

    c = TestClient(app, base_url="https://testserver")
    res = c.post("/api/contracts/clauses/generate", json={"clause_type": "Gizlilik", "context": "", "preferences": {}})
    assert res.status_code == 200
    assert res.json()["clause"] == "MADDE"


def test_contract_export_udf(monkeypatch):
    app = FastAPI()
    app.include_router(contract_routes.router)
    app.dependency_overrides[contract_routes.get_current_user] = lambda: {"id": "u1"}

    c = TestClient(app, base_url="https://testserver")
    res = c.post("/api/contracts/export", json={"title": "t", "content": "X", "format": "udf"})
    assert res.status_code == 200
    assert res.headers.get("x-file-sha256")
    assert res.content.startswith(b"TITLE:")


def test_contract_export_docx(monkeypatch):
    app = FastAPI()
    app.include_router(contract_routes.router)
    app.dependency_overrides[contract_routes.get_current_user] = lambda: {"id": "u1"}

    c = TestClient(app, base_url="https://testserver")
    res = c.post("/api/contracts/export", json={"title": "t", "content": "X", "format": "docx"})
    assert res.status_code == 200
    assert res.headers.get("x-file-sha256")
    assert res.headers.get("content-type", "").startswith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


def test_contract_export_pdf(monkeypatch):
    app = FastAPI()
    app.include_router(contract_routes.router)
    app.dependency_overrides[contract_routes.get_current_user] = lambda: {"id": "u1"}

    c = TestClient(app, base_url="https://testserver")
    res = c.post("/api/contracts/export", json={"title": "t", "content": "X", "format": "pdf"})
    assert res.status_code == 200
    assert res.headers.get("x-file-sha256")
    assert res.headers.get("content-type", "").startswith("application/pdf")


def test_contract_analyze_file_txt(monkeypatch):
    app = FastAPI()
    app.include_router(contract_routes.router)
    app.dependency_overrides[contract_routes.get_current_user] = lambda: {"id": "u1"}

    analysis_json = """{"genel_ozet":"ok","risk_puani":10,"risk_seviyesi":"dusuk","guclu_yonler":[],"zayif_yonler":[],"gelecek_riskleri":[],"eksik_maddeler":[],"uyum_kontrolleri":{"tbk":[],"kvkk":[],"ticaret":[],"is_hukuku":[]},"maddeler":[],"oneriler":[],"eksik_bilgi":[]}"""
    monkeypatch.setattr(contract_routes, "get_openai_client", lambda: _mock_openai_json(analysis_json))
    monkeypatch.setattr(contract_routes, "get_db_cursor", _fake_db_cursor)

    c = TestClient(app, base_url="https://testserver")
    res = c.post(
        "/api/contracts/analyze-file",
        data={"title": "t"},
        files={"file": ("a.txt", b"HELLO", "text/plain")},
    )
    assert res.status_code == 200
    assert res.json()["analysis"]["risk_puani"] == 10
