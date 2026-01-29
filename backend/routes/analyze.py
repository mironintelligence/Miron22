from fastapi import APIRouter, UploadFile, Depends
from auth import get_current_user
import os, shutil

router = APIRouter(prefix="/analyze", tags=["Analyze"])

@router.post("/upload")
async def upload_doc(file: UploadFile, user_id: str = Depends(get_current_user)):
    user_dir = f"user_data/{user_id}/uploads"
    os.makedirs(user_dir, exist_ok=True)
    path = os.path.join(user_dir, file.filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"status": "success", "filename": file.filename}
