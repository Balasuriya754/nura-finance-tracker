from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from schemas.reimbursement import ReimbursementStatus
from typing import Optional
import time

class ReimbursementService:
    @staticmethod
    async def get_all_reimbursements(
        db: AsyncIOMotorDatabase,
        start_ts: Optional[int] = None,
        end_ts: Optional[int] = None
    ):
        match_stage = {"is_deleted": False}
        if start_ts is not None or end_ts is not None:
            match_stage["created_at"] = {}
            if start_ts is not None:
                match_stage["created_at"]["$gte"] = start_ts
            if end_ts is not None:
                match_stage["created_at"]["$lte"] = end_ts

        pipeline = [
            {"$match": match_stage},
            {"$sort": {"created_at": -1}},
            {"$lookup": {
                "from": "users",
                "localField": "user_uuid",
                "foreignField": "uuid",
                "as": "user_info"
            }},
            {"$unwind": {
                "path": "$user_info",
                "preserveNullAndEmptyArrays": True
            }},
            {"$lookup": {
                "from": "expenses",
                "localField": "expense_uuid",
                "foreignField": "uuid",
                "as": "expense_info"
            }},
            {"$unwind": {
                "path": "$expense_info",
                "preserveNullAndEmptyArrays": True
            }},
            {"$addFields": {
                "employee_name": "$user_info.name",
                "employee_email": "$user_info.email",
                "employee_phone": "$user_info.phone",
                "description": "$expense_info.description",
                "vendor": "$expense_info.vendor",
                "expense_date": "$expense_info.expense_date",
                "bill_url": "$expense_info.bill_url",
                "review_status": "$expense_info.review_status"
            }},
            {"$project": {
                "user_info": 0,
                "expense_info": 0
            }}
        ]
        reimbursements = await db["reimbursements"].aggregate(pipeline).to_list(length=1000)
        for r in reimbursements:
            if "amount" in r and r["amount"] is not None:
                from decimal import Decimal
                if hasattr(r["amount"], "to_decimal"):
                    r["amount"] = Decimal(str(r["amount"].to_decimal()))
                else:
                    r["amount"] = Decimal(str(r["amount"]))
        return reimbursements

    @staticmethod
    async def complete_reimbursement(reimbursement_uuid: str, admin_user_uuid: str, remarks: str, db: AsyncIOMotorDatabase):
        reimbursement = await db["reimbursements"].find_one({"uuid": reimbursement_uuid, "is_deleted": False})
        if not reimbursement:
            raise HTTPException(status_code=404, detail="Reimbursement not found")
            
        if reimbursement.get("reimbursement_status") != ReimbursementStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only pending reimbursements can be marked as completed")
            
        now = int(time.time() * 1000)
        update_data = {
            "reimbursement_status": ReimbursementStatus.COMPLETED,
            "paid_by_user_uuid": admin_user_uuid,
            "paid_at": now,
            "remarks": remarks,
            "updated_at": now
        }
        await db["reimbursements"].update_one({"uuid": reimbursement_uuid}, {"$set": update_data})
        
        reimbursement.update(update_data)
        if "amount" in reimbursement and reimbursement["amount"] is not None:
            from decimal import Decimal
            reimbursement["amount"] = Decimal(str(reimbursement["amount"]))
        return reimbursement
