from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseReviewStatus, MainCategory, PaidUsing, PaymentMethod
from auth.auth_utils import get_current_user_uuid, get_database
from services.expense import ExpenseService
import json
from decimal import Decimal

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

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
