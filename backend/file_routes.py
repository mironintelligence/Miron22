from fastapi import APIRouter, UploadFile, File
import asyncio

router = APIRouter(prefix="/analyze")

@router.post("/")
async def analyze_file(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")

    # Simüle edilmiş 20 saniyelik analiz süresi
    for i in range(20):
        await asyncio.sleep(1)

    # Özet dosyaya kaydet
    with open("latest_case.txt", "w", encoding="utf-8") as f:
        f.write(text)

    return {"summary": "Dosya başarıyla analiz edildi ve Libra Assistant’a aktarıldı."}
