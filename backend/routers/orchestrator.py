from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from services.orchestrator import orchestrator

router = APIRouter(prefix="/orchestrator", tags=["Orchestrator"])

class AnalysisRequest(BaseModel):
    case_text: str
    user_role: str = "Davacı"

class AnalysisResponse(BaseModel):
    risk_analysis: Dict[str, Any]
    strategy_advice: str
    normalized_text_preview: str

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_case(request: AnalysisRequest):
    try:
        result = await orchestrator.analyze_case(request.case_text, request.user_role)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "Orchestrator"}
