from fastapi import FastAPI
from fastapi.testclient import TestClient

import routes.contract_routes as contract_routes


def _app():
    app = FastAPI()
    app.include_router(contract_routes.router)
    app.dependency_overrides[contract_routes.get_current_user] = lambda: {"id": "u1"}
    return app


def test_analysis_report_preview(monkeypatch):
    monkeypatch.setattr(contract_routes, "_load_user_for_report", lambda _uid: {"email": "a@b.com", "first_name": "A", "last_name": "B"})
    c = TestClient(_app(), base_url="https://testserver")
    res = c.post(
        "/api/contracts/analysis/preview",
        json={
            "title": "t",
            "content": "X",
            "analysis": {"genel_ozet": "ok", "risk_puani": 10, "risk_seviyesi": "dusuk"},
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert "RİSK PUANI" in body["report"]


def test_analysis_report_export_txt(monkeypatch):
    monkeypatch.setattr(contract_routes, "_load_user_for_report", lambda _uid: {"email": "a@b.com", "first_name": "A", "last_name": "B"})
    c = TestClient(_app(), base_url="https://testserver")
    res = c.post(
        "/api/contracts/analysis/export",
        json={
            "title": "t",
            "content": "X",
            "analysis": {"genel_ozet": "ok", "risk_puani": 10, "risk_seviyesi": "dusuk"},
            "format": "txt",
        },
    )
    assert res.status_code == 200
    assert res.headers.get("x-file-sha256")
    assert res.headers.get("content-type", "").startswith("text/plain")
    assert b"R\xc4\xb0SK PUANI" in res.content


def test_analysis_report_export_pdf(monkeypatch):
    monkeypatch.setattr(contract_routes, "_load_user_for_report", lambda _uid: {"email": "a@b.com", "first_name": "A", "last_name": "B"})
    c = TestClient(_app(), base_url="https://testserver")
    res = c.post(
        "/api/contracts/analysis/export",
        json={
            "title": "t",
            "content": "X",
            "analysis": {"genel_ozet": "ok", "risk_puani": 10, "risk_seviyesi": "dusuk"},
            "format": "pdf",
        },
    )
    assert res.status_code == 200
    assert res.headers.get("x-file-sha256")
    assert res.headers.get("content-type", "").startswith("application/pdf")


def test_analysis_report_export_docx(monkeypatch):
    monkeypatch.setattr(contract_routes, "_load_user_for_report", lambda _uid: {"email": "a@b.com", "first_name": "A", "last_name": "B"})
    c = TestClient(_app(), base_url="https://testserver")
    res = c.post(
        "/api/contracts/analysis/export",
        json={
            "title": "t",
            "content": "X",
            "analysis": {"genel_ozet": "ok", "risk_puani": 10, "risk_seviyesi": "dusuk"},
            "format": "docx",
        },
    )
    assert res.status_code == 200
    assert res.headers.get("x-file-sha256")
    assert res.headers.get("content-type", "").startswith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

