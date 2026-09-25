from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, PaymentMethod
from auth.auth_utils import get_current_user_uuid, get_database
from services.expense import ExpenseService
import json
from decimal import Decimal
from utils.cache import CacheHelper
from fastapi.responses import StreamingResponse
from repositories.user import get_user_by_uuid
from services.export import ExportService

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

from fastapi.responses import RedirectResponse
import uuid

from fastapi import UploadFile, File, Form

@router.post("/share-target")
async def share_target(
    shared_file: UploadFile = File(None),
    title: str = Form(None),
    text: str = Form(None),
    url: str = Form(None),
    db=Depends(get_database)
):
    """
    Receives file from PWA Web Share Target natively.
    No Auth because browsers do not attach Authorization headers to native form submissions.
    """
    if not shared_file or not hasattr(shared_file, "filename") or not shared_file.filename:
        print("Share target failed: No file provided or filename missing")
        return RedirectResponse(url="/add-expense", status_code=303)
        
    shared_id = str(uuid.uuid4())
    
    # Store temporarily in DB
    file_content = await shared_file.read()
    
    await db["shared_temp"].insert_one({
        "shared_id": shared_id,
        "filename": shared_file.filename,
        "content_type": shared_file.content_type,
        "data": file_content,
        "created_at": __import__('time').time()
    })
    
    return RedirectResponse(url=f"/add-expense?shared_id={shared_id}", status_code=303)

from fastapi.responses import Response

@router.get("/shared-file/{shared_id}")
async def get_shared_file(
    shared_id: str,
    user_uuid: str = Depends(get_current_user_uuid),
    db=Depends(get_database)
):
    """
    Returns the raw file data for a shared image so frontend can store it locally.
    """
    temp_file = await db["shared_temp"].find_one({"shared_id": shared_id})
    if not temp_file:
        raise HTTPException(status_code=404, detail="Shared file not found or expired")
        
    return Response(content=temp_file["data"], media_type=temp_file["content_type"])

@router.delete("/shared-file/{shared_id}")
async def delete_shared_file(
    shared_id: str,
    user_uuid: str = Depends(get_current_user_uuid),
    db=Depends(get_database)
):
    """
    Cleans up the temporary shared file.
    """
    await db["shared_temp"].delete_one({"shared_id": shared_id})
    return {"message": "Temporary file deleted"}

@router.post("/", response_model=ExpenseResponse)
async def create_expense(
    file: UploadFile = File(...),
    description: str = Form(...),
    amount: Decimal = Form(...),
    vendor: str = Form(...),
    gst_bill: bool = Form(...),
    payment_method: PaymentMethod = Form(...),
    expense_date: Optional[int] = Form(None),
    user_uuid: str = Depends(get_current_user_uuid),
    db=Depends(get_database)
):
    expense_data = {
        "description": description,
        "amount": amount,
        "vendor": vendor,
        "gst_bill": gst_bill,
        "payment_method": payment_method,
        "expense_date": expense_date
    }
    result = await ExpenseService.create_expense(expense_data, file, user_uuid, db)
    await CacheHelper.invalidate(f"emp_exp:{user_uuid}")
    await CacheHelper.invalidate(f"emp_snacks:{user_uuid}")
    await CacheHelper.invalidate_pattern("admin_exp:*")
    await CacheHelper.invalidate_pattern("admin_over:*")
    return result

@router.get("/", response_model=List[ExpenseResponse])
async def get_my_expenses(user_uuid: str = Depends(get_current_user_uuid), db=Depends(get_database)):
    cache_key = f"emp_exp:{user_uuid}"
    cached = await CacheHelper.get(cache_key)
    if cached:
        return cached

    data = await ExpenseService.get_my_expenses(user_uuid, db)
    await CacheHelper.set(cache_key, data)
    return data

@router.get("/snacks/summary")
async def get_snacks_summary(
    start_ts: int, 
    end_ts: int, 
    user_uuid: str = Depends(get_current_user_uuid), 
    db=Depends(get_database)
):
    # No caching for date-range specific queries to keep it simple and accurate
    data = await ExpenseService.get_snacks_summary(user_uuid, start_ts, end_ts, db)
    return data

@router.get("/{expense_uuid}", response_model=ExpenseResponse)
async def get_expense(expense_uuid: str, user_uuid: str = Depends(get_current_user_uuid), db=Depends(get_database)):
    from repositories.expense import get_expense_by_uuid
    expense = await get_expense_by_uuid(db, expense_uuid, user_uuid)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if "amount" in expense:
        from decimal import Decimal
        expense["amount"] = Decimal(str(expense["amount"]))
    return expense

@router.put("/{expense_uuid}", response_model=ExpenseResponse)
async def update_expense(
    expense_uuid: str, 
    expense_update: ExpenseUpdate, 
    user_uuid: str = Depends(get_current_user_uuid), 
    db=Depends(get_database)
):
    result = await ExpenseService.update_expense(expense_uuid, expense_update, user_uuid, db)
    await CacheHelper.invalidate(f"emp_exp:{user_uuid}")
    await CacheHelper.invalidate(f"emp_snacks:{user_uuid}")
    await CacheHelper.invalidate_pattern("admin_exp:*")
    await CacheHelper.invalidate_pattern("admin_over:*")
    return result

@router.delete("/{expense_uuid}")
async def delete_expense(
    expense_uuid: str, 
    user_uuid: str = Depends(get_current_user_uuid), 
    db=Depends(get_database)
):
    result = await ExpenseService.delete_expense(expense_uuid, user_uuid, db)
    await CacheHelper.invalidate(f"emp_exp:{user_uuid}")
    await CacheHelper.invalidate(f"emp_snacks:{user_uuid}")
    await CacheHelper.invalidate_pattern("admin_exp:*")
    await CacheHelper.invalidate_pattern("admin_over:*")
    return result

@router.get("/export/data")
async def export_expenses(
    start_date: int,
    end_date: int,
    export_format: str = "excel",
    user_uuid: str = Depends(get_current_user_uuid),
    db=Depends(get_database)
):
    all_expenses = await ExpenseService.get_my_expenses(user_uuid, db)
    
    filtered = []
    for exp in all_expenses:
        exp_date = exp.get("expense_date", 0)
        if start_date <= exp_date <= end_date:
            filtered.append(exp)

    user = await get_user_by_uuid(db, user_uuid)
    user_name = user.get("name", "Employee") if user else "Employee"

    if export_format == "zip":
        zip_buffer = await ExportService.generate_zip(filtered, user_name)
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=expenses_export.zip"}
        )
    else:
        excel_buffer = await ExportService.generate_excel(filtered, user_name)
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=expenses_export.xlsx"}
        )
