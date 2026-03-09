from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import uuid

# Adjust imports based on your project structure
from db_async import db
from admin_auth import require_admin

router = APIRouter(prefix="/api/hotels", tags=["Hotel Management"])

# --- Models ---
class HotelApplicationRequest(BaseModel):
    hotel_name: str
    city: str
    monthly_customer_count: int
    reason: str
    phone: str
    email: EmailStr

class HotelApplicationResponse(BaseModel):
    id: str
    status: str
    created_at: datetime

class AdminStatsResponse(BaseModel):
    total_applications: int
    pending_applications: int
    total_hotels: int
    total_users: int

# --- Routes ---

@router.post("/apply", response_model=HotelApplicationResponse)
async def submit_application(app: HotelApplicationRequest):
    """
    Public endpoint for hotels to apply.
    """
    query = """
        INSERT INTO hotel_requests (hotel_name, city, monthly_customer_count, reason, phone, email)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, status, created_at
    """
    try:
        row = await db.fetch_one(
            query, 
            app.hotel_name, 
            app.city, 
            app.monthly_customer_count, 
            app.reason, 
            app.phone, 
            app.email
        )
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application submission failed: {str(e)}")

@router.get("/applications", dependencies=[Depends(require_admin)])
async def list_applications(status: Optional[str] = None):
    """
    Admin only: List hotel applications.
    """
    base_query = "SELECT * FROM hotel_requests"
    if status:
        query = f"{base_query} WHERE status = $1 ORDER BY created_at DESC"
        rows = await db.fetch_all(query, status)
    else:
        query = f"{base_query} ORDER BY created_at DESC"
        rows = await db.fetch_all(query)
    return [dict(row) for row in rows]

@router.post("/approve/{request_id}", dependencies=[Depends(require_admin)])
async def approve_application(request_id: str):
    """
    Admin only: Approve application -> Create Hotel -> Update Request Status.
    """
    # 1. Get request details
    req = await db.fetch_one("SELECT * FROM hotel_requests WHERE id = $1", request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req['status'] == 'approved':
        raise HTTPException(status_code=400, detail="Request already approved")

    # 2. Create Hotel
    try:
        # Start transaction logic manually or implicitly via sequential queries
        
        hotel_id = await db.fetch_one(
            "INSERT INTO hotels (name, city) VALUES ($1, $2) RETURNING id",
            req['hotel_name'], req['city']
        )
        
        # 3. Update Request Status
        await db.execute(
            "UPDATE hotel_requests SET status = 'approved' WHERE id = $1",
            request_id
        )
        
        return {"status": "approved", "hotel_id": str(hotel_id['id'])}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval failed: {str(e)}")

@router.post("/reject/{request_id}", dependencies=[Depends(require_admin)])
async def reject_application(request_id: str):
    """
    Admin only: Reject application.
    """
    exists = await db.fetch_one("SELECT 1 FROM hotel_requests WHERE id = $1", request_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Request not found")

    await db.execute("UPDATE hotel_requests SET status = 'rejected' WHERE id = $1", request_id)
    return {"status": "rejected"}

@router.get("/stats", dependencies=[Depends(require_admin)])
async def get_admin_stats():
    """
    Admin dashboard stats.
    """
    total_apps = await db.fetch_one("SELECT COUNT(*) FROM hotel_requests")
    pending_apps = await db.fetch_one("SELECT COUNT(*) FROM hotel_requests WHERE status = 'pending'")
    total_hotels = await db.fetch_one("SELECT COUNT(*) FROM hotels")
    total_users = await db.fetch_one("SELECT COUNT(*) FROM users")
    
    return {
        "total_applications": total_apps['count'],
        "pending_applications": pending_apps['count'],
        "total_hotels": total_hotels['count'],
        "total_users": total_users['count']
    }
