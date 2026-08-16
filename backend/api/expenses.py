from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseReviewStatus, MainCategory, PaidUsing, PaymentMethod
from auth.auth_utils import get_current_user_uuid, get_database
from services.expense import ExpenseService
import json
from decimal import Decimal

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

from fastapi.responses import RedirectResponse
import uuid

@router.post("/share-target")
async def share_target(
    shared_file: Optional[UploadFile] = File(None),
    title: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    db=Depends(get_database)
):
    """
    Receives file from PWA Web Share Target natively.
    No Auth because browsers do not attach Authorization headers to native form submissions.
    """
    if not shared_file:
        return RedirectResponse(url="/add-expense", status_code=303)
        
    shared_id = str(uuid.uuid4())
    
    # Store temporarily in DB
    file_content = await shared_file.read()
    
    # Using GridFS or just a simple collection for temporary storage.
    # Since it's a small file and temporary, we can store it in MongoDB directly (up to 16MB)
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
    file: Optional[UploadFile] = File(None),
    description: str = Form(...),
    amount: Decimal = Form(...),
    main_category: MainCategory = Form(...),
    sub_category: str = Form(...),
    vendor: str = Form(...),
    gst_bill: bool = Form(...),
    paid_using: PaidUsing = Form(...),
    payment_method: PaymentMethod = Form(...),
    expense_date: Optional[int] = Form(None),
    review_status: ExpenseReviewStatus = Form(ExpenseReviewStatus.PENDING),
    user_uuid: str = Depends(get_current_user_uuid),
    db=Depends(get_database)
):
    expense_data = {
        "description": description,
        "amount": amount,
        "main_category": main_category,
        "sub_category": sub_category,
        "vendor": vendor,
        "gst_bill": gst_bill,
        "paid_using": paid_using,
        "payment_method": payment_method,
        "expense_date": expense_date,
        "review_status": review_status
    }
    return await ExpenseService.create_expense(expense_data, file, user_uuid, db)

@router.get("/", response_model=List[ExpenseResponse])
async def get_my_expenses(user_uuid: str = Depends(get_current_user_uuid), db=Depends(get_database)):
    return await ExpenseService.get_my_expenses(user_uuid, db)

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
    return await ExpenseService.update_expense(expense_uuid, expense_update, user_uuid, db)

@router.delete("/{expense_uuid}")
async def delete_expense(
    expense_uuid: str, 
    user_uuid: str = Depends(get_current_user_uuid), 
    db=Depends(get_database)
):
    return await ExpenseService.delete_expense(expense_uuid, user_uuid, db)
