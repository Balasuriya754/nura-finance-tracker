from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str
    otp: str

class SendOTPRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class UserResponse(BaseModel):
    uuid: str
    name: str
    email: EmailStr
    phone: str
    is_active: bool
    created_at: int
    updated_at: int
    
    # Aggregated metrics for Admin Dashboard
    total_expenses_amount: Optional[float] = 0.0
    pending_reviews_count: Optional[int] = 0
    pending_reimbursements_amount: Optional[float] = 0.0
