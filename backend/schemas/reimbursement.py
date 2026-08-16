from pydantic import BaseModel, model_validator
from enum import Enum
from decimal import Decimal
from typing import Optional

class ReimbursementStatus(str, Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"

class ReimbursementResponse(BaseModel):
    uuid: str
    expense_uuid: str
    user_uuid: str
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    employee_phone: Optional[str] = None
    description: Optional[str] = None
    vendor: Optional[str] = None
    expense_date: Optional[int] = None
    bill_url: Optional[str] = None
    review_status: Optional[str] = None
    amount: Decimal
    reimbursement_status: ReimbursementStatus
    remarks: Optional[str] = ""
    paid_at: Optional[int] = None
    created_at: int
    updated_at: int
    
    @model_validator(mode='after')
    def generate_signed_url(self) -> 'ReimbursementResponse':
        if self.bill_url and not self.bill_url.startswith('http'):
            from utils.s3 import generate_presigned_url
            self.bill_url = generate_presigned_url(self.bill_url)
        return self
