from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Optional
from utils.date_filters import get_date_range
from schemas.user import UserResponse
from schemas.expense import ExpenseResponse
from schemas.reimbursement import ReimbursementResponse
from auth.auth_utils import require_dashboard_access, get_database, get_current_user_uuid
from services.dashboard import DashboardService
from services.expense import ExpenseService
from services.user import UserService
from services.reimbursement import ReimbursementService
from pydantic import BaseModel

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/overview")
async def get_overview(
    from_ts: Optional[int] = Query(None, alias="from"),
    to_ts: Optional[int] = Query(None, alias="to"),
    preset: Optional[str] = None,
    user_uuid: str = Depends(require_dashboard_access),
    db = Depends(get_database)
):
    start_ts, end_ts = get_date_range(from_ts, to_ts, preset)
    return await DashboardService.get_overview_stats(db, start_ts, end_ts)

@router.get("/expenses", response_model=List[ExpenseResponse])
async def get_all_expenses(
    from_ts: Optional[int] = Query(None, alias="from"),
    to_ts: Optional[int] = Query(None, alias="to"),
    preset: Optional[str] = None,
    user_uuid: str = Depends(require_dashboard_access),
    db = Depends(get_database)
):
    start_ts, end_ts = get_date_range(from_ts, to_ts, preset)
    return await ExpenseService.get_all_expenses(db, start_ts, end_ts)

@router.get("/expenses/{expense_uuid}", response_model=ExpenseResponse)
async def get_expense_details(
    expense_uuid: str,
    user_uuid: str = Depends(require_dashboard_access),
    db = Depends(get_database)
):
    from repositories.expense import get_expense_by_uuid
    # We pass None for user_uuid in repo call or bypass user check since admin can view any
    expense = await db["expenses"].find_one({"uuid": expense_uuid, "is_deleted": False})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if "amount" in expense and expense["amount"] is not None:
        from decimal import Decimal
        expense["amount"] = Decimal(str(expense["amount"]))
    return expense

@router.put("/expenses/{expense_uuid}/approve", response_model=ExpenseResponse)
async def approve_expense(
    expense_uuid: str,
    user_uuid: str = Depends(require_dashboard_access),
    db = Depends(get_database)
):
    return await ExpenseService.approve_expense(expense_uuid, db)

@router.put("/expenses/{expense_uuid}/reject", response_model=ExpenseResponse)
async def reject_expense(
    expense_uuid: str,
    user_uuid: str = Depends(require_dashboard_access),
    db = Depends(get_database)
):
    return await ExpenseService.reject_expense(expense_uuid, db)

@router.get("/reimbursements", response_model=List[ReimbursementResponse])
async def get_all_reimbursements(
    from_ts: Optional[int] = Query(None, alias="from"),
    to_ts: Optional[int] = Query(None, alias="to"),
    preset: Optional[str] = None,
    user_uuid: str = Depends(require_dashboard_access),
    db = Depends(get_database)
):
    start_ts, end_ts = get_date_range(from_ts, to_ts, preset)
    return await ReimbursementService.get_all_reimbursements(db, start_ts, end_ts)

class CompleteReimbursementRequest(BaseModel):
    remarks: str

@router.put("/reimbursements/{reimbursement_uuid}/complete", response_model=ReimbursementResponse)
async def complete_reimbursement(
    reimbursement_uuid: str,
    payload: CompleteReimbursementRequest,
    admin_user_uuid: str = Depends(require_dashboard_access),
    db = Depends(get_database)
):
    return await ReimbursementService.complete_reimbursement(reimbursement_uuid, admin_user_uuid, payload.remarks, db)

@router.get("/employees", response_model=List[UserResponse])
async def get_all_employees(
    user_uuid: str = Depends(require_dashboard_access),
    db = Depends(get_database)
):
    return await UserService.get_all_users(db)

@router.get("/employees/{employee_uuid}")
async def get_employee_profile(
    employee_uuid: str,
    user_uuid: str = Depends(require_dashboard_access),
    db = Depends(get_database)
):
    return await DashboardService.get_employee_profile_stats(employee_uuid, db)
