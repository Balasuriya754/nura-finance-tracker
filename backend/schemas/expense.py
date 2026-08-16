from pydantic import BaseModel, model_validator
from typing import Optional
from enum import Enum
from decimal import Decimal

class PaymentMethod(str, Enum):
    UPI = "UPI"
    CASH = "CASH"
    CARD = "CARD"
    BANK = "BANK"

class MainCategory(str, Enum):
    OPERATIONS = "Operations"
    ENGINEERING = "Engineering"
    SALES = "Sales"
    MARKETING = "Marketing"
    HR = "HR"
    CUSTOMER_SERVICE = "Customer Service"

class PaidUsing(str, Enum):
    PERSONAL = "PERSONAL"
    COMPANY = "COMPANY"

class ExpenseReviewStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ExpenseCreate(BaseModel):
    description: str
    amount: Decimal
    main_category: MainCategory
    sub_category: str
    vendor: str
    gst_bill: bool
    paid_using: PaidUsing
    payment_method: PaymentMethod
    expense_date: Optional[int] = None
    review_status: ExpenseReviewStatus = ExpenseReviewStatus.PENDING # Default to PENDING, can be DRAFT

class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    main_category: Optional[MainCategory] = None
    sub_category: Optional[str] = None
    vendor: Optional[str] = None
    gst_bill: Optional[bool] = None
    paid_using: Optional[PaidUsing] = None
    payment_method: Optional[PaymentMethod] = None
    expense_date: Optional[int] = None
    review_status: Optional[ExpenseReviewStatus] = None

class ExpenseResponse(BaseModel):
    uuid: str
    user_uuid: str
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    employee_phone: Optional[str] = None
    description: str
    amount: Decimal
    main_category: Optional[MainCategory] = None
    sub_category: Optional[str] = None
    vendor: Optional[str] = None
    gst_bill: Optional[bool] = None
    paid_using: PaidUsing
    payment_method: PaymentMethod
    bill_url: Optional[str] = None
    expense_date: int
    review_status: ExpenseReviewStatus
    reimbursement_status: Optional[str] = None
    created_at: int
    updated_at: int
    
    @model_validator(mode='after')
    def generate_signed_url(self) -> 'ExpenseResponse':
        if self.bill_url and not self.bill_url.startswith('http'):
            from utils.s3 import generate_presigned_url
            # If it's an S3 key, generate a temporary URL valid for 1 hour
            self.bill_url = generate_presigned_url(self.bill_url)
        return self
