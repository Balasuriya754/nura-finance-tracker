from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, UploadFile
from typing import Optional
from schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseReviewStatus, PaidUsing
from schemas.reimbursement import ReimbursementStatus
from repositories.expense import create_expense, get_expense_by_uuid, get_expenses_by_user, update_expense, soft_delete_expense
from repositories.reimbursement import create_reimbursement, get_reimbursement_by_expense_uuid, soft_delete_pending_reimbursement
from utils.ids import generate_expense_id, generate_reimbursement_id
from utils.s3 import upload_bill_to_s3
import time
from decimal import Decimal

class ExpenseService:
    @staticmethod
    async def create_expense(
        expense_data: dict, 
        file: Optional[UploadFile], 
        user_uuid: str, 
        db: AsyncIOMotorDatabase
    ) -> dict:
        
        expense_uuid = await generate_expense_id(db)
        now = int(time.time() * 1000)
        
        # Upload bill directly handling the generated ID
        bill_url = None
        if file:
            bill_url = upload_bill_to_s3(
                file_obj=file.file,
                user_uuid=user_uuid,
                expense_uuid=expense_uuid,
                filename=file.filename,
                content_type=file.content_type
            )
        
        new_expense = {
            "uuid": expense_uuid,
            "user_uuid": user_uuid,
            "description": expense_data["description"],
            "amount": str(expense_data["amount"]), # Store as string or Decimal128 in MongoDB if configured, but keeping string for generic MongoDB is safer unless using Decimal128 explicitly. Let's use Decimal128 representation or convert to string for motor compatibility. Motor accepts Decimal128. Let's use Decimal type which gets converted by PyMongo to Decimal128. Actually, standard Decimal is fine, motor converts it if CodecOptions is set, but to be safe let's just use float() or keep as Decimal. Wait, user specifically requested Decimal. Let's use float for MongoDB, wait user said "Decimal128".
            # For simplicity, let's keep Decimal. Pydantic models will handle conversion.
            "amount": expense_data["amount"],
            "main_category": expense_data["main_category"],
            "sub_category": expense_data["sub_category"],
            "vendor": expense_data["vendor"],
            "gst_bill": expense_data["gst_bill"],
            "paid_using": expense_data["paid_using"],
            "payment_method": expense_data["payment_method"],
            "bill_url": bill_url,
            "review_status": expense_data["review_status"],
            "expense_date": expense_data.get("expense_date") or now,
            "created_at": now,
            "updated_at": now,
            "is_deleted": False
        }
        
        # We need to handle Decimal for Motor to Decimal128.
        # Motor requires bson.decimal128.Decimal128 for Decimals.
        from bson.decimal128 import Decimal128
        new_expense["amount"] = Decimal128(str(new_expense["amount"]))
        
        await create_expense(db, new_expense)
        
        # Convert back to regular Decimal for Pydantic response
        new_expense["amount"] = Decimal(str(new_expense["amount"]))
        
        # Remove MongoDB ObjectId before returning to avoid serialization errors
        new_expense.pop("_id", None)
        return new_expense

    @staticmethod
    async def get_my_expenses(user_uuid: str, db: AsyncIOMotorDatabase):
        pipeline = [
            {"$match": {"user_uuid": user_uuid, "is_deleted": False}},
            {"$sort": {"created_at": -1}},
            {"$lookup": {
                "from": "reimbursements",
                "localField": "uuid",
                "foreignField": "expense_uuid",
                "pipeline": [{"$match": {"is_deleted": False}}],
                "as": "reimbursements"
            }},
            {"$addFields": {
                "reimbursement_status": {
                    "$cond": {
                        "if": {"$eq": ["$paid_using", "COMPANY"]},
                        "then": "NOT_REQUIRED",
                        "else": {
                            "$cond": {
                                "if": {"$ne": ["$review_status", "APPROVED"]},
                                "then": "NOT_REQUIRED",
                                "else": {
                                    "$cond": {
                                        "if": {"$gt": [{"$size": "$reimbursements"}, 0]},
                                        "then": {"$arrayElemAt": ["$reimbursements.reimbursement_status", 0]},
                                        "else": "NOT_REQUIRED"
                                    }
                                }
                            }
                        }
                    }
                }
            }},
            {"$project": {
                "reimbursements": 0
            }}
        ]
        expenses = await db["expenses"].aggregate(pipeline).to_list(length=1000)
        for exp in expenses:
            if "amount" in exp and exp["amount"] is not None:
                from decimal import Decimal
                if hasattr(exp["amount"], "to_decimal"):
                    exp["amount"] = Decimal(str(exp["amount"].to_decimal()))
                else:
                    exp["amount"] = Decimal(str(exp["amount"]))
        return expenses

    @staticmethod
    async def update_expense(expense_uuid: str, expense_update: ExpenseUpdate, user_uuid: str, db: AsyncIOMotorDatabase):
        expense = await get_expense_by_uuid(db, expense_uuid, user_uuid)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
            
        if expense.get("review_status") not in [ExpenseReviewStatus.DRAFT, ExpenseReviewStatus.PENDING]:
            raise HTTPException(status_code=400, detail="Cannot edit approved or rejected expenses")
            
        update_data = {k: v for k, v in expense_update.dict().items() if v is not None}
        
        if "amount" in update_data:
            from bson.decimal128 import Decimal128
            update_data["amount"] = Decimal128(str(update_data["amount"]))
            
        update_data["updated_at"] = int(time.time() * 1000)
        
        await update_expense(db, expense_uuid, update_data)
        
        updated_expense = await get_expense_by_uuid(db, expense_uuid, user_uuid)
        if updated_expense and "amount" in updated_expense:
            from decimal import Decimal
            updated_expense["amount"] = Decimal(str(updated_expense["amount"]))
        return updated_expense

    @staticmethod
    async def delete_expense(expense_uuid: str, user_uuid: str, db: AsyncIOMotorDatabase):
        expense = await get_expense_by_uuid(db, expense_uuid, user_uuid)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
            
        if expense.get("review_status") not in [ExpenseReviewStatus.DRAFT, ExpenseReviewStatus.PENDING]:
            raise HTTPException(status_code=400, detail="Cannot delete approved or rejected expenses")
            
        await soft_delete_expense(db, expense_uuid)
        await soft_delete_pending_reimbursement(db, expense_uuid)
        
        return {"message": "Expense deleted successfully"}

    @staticmethod
    async def get_all_expenses(
        db: AsyncIOMotorDatabase,
        start_ts: Optional[int] = None,
        end_ts: Optional[int] = None
    ):
        match_stage = {"is_deleted": False}
        if start_ts is not None or end_ts is not None:
            match_stage["expense_date"] = {}
            if start_ts is not None:
                match_stage["expense_date"]["$gte"] = start_ts
            if end_ts is not None:
                match_stage["expense_date"]["$lte"] = end_ts

        pipeline = [
            {"$match": match_stage},
            {"$sort": {"created_at": -1}},
            {"$lookup": {
                "from": "users",
                "localField": "user_uuid",
                "foreignField": "uuid",
                "as": "user_info"
            }},
            {"$lookup": {
                "from": "reimbursements",
                "localField": "uuid",
                "foreignField": "expense_uuid",
                "pipeline": [{"$match": {"is_deleted": False}}],
                "as": "reimbursements"
            }},
            {"$unwind": {
                "path": "$user_info",
                "preserveNullAndEmptyArrays": True
            }},
            {"$addFields": {
                "employee_name": "$user_info.name",
                "employee_email": "$user_info.email",
                "employee_phone": "$user_info.phone",
                "reimbursement_status": {
                    "$cond": {
                        "if": {"$eq": ["$paid_using", "COMPANY"]},
                        "then": "NOT_REQUIRED",
                        "else": {
                            "$cond": {
                                "if": {"$ne": ["$review_status", "APPROVED"]},
                                "then": "NOT_REQUIRED",
                                "else": {
                                    "$cond": {
                                        "if": {"$gt": [{"$size": "$reimbursements"}, 0]},
                                        "then": {"$arrayElemAt": ["$reimbursements.reimbursement_status", 0]},
                                        "else": "NOT_REQUIRED"
                                    }
                                }
                            }
                        }
                    }
                }
            }},
            {"$project": {
                "user_info": 0,
                "reimbursements": 0
            }}
        ]
        expenses = await db["expenses"].aggregate(pipeline).to_list(length=1000)
        for exp in expenses:
            if "amount" in exp and exp["amount"] is not None:
                from decimal import Decimal
                if hasattr(exp["amount"], "to_decimal"):
                    exp["amount"] = Decimal(str(exp["amount"].to_decimal()))
                else:
                    exp["amount"] = Decimal(str(exp["amount"]))
        return expenses

    @staticmethod
    async def approve_expense(expense_uuid: str, db: AsyncIOMotorDatabase):
        expense = await db["expenses"].find_one({"uuid": expense_uuid, "is_deleted": False})
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        if expense.get("review_status") != ExpenseReviewStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only pending expenses can be approved")
            
        update_data = {
            "review_status": ExpenseReviewStatus.APPROVED,
            "updated_at": int(time.time() * 1000)
        }
        await db["expenses"].update_one({"uuid": expense_uuid}, {"$set": update_data})
        
        # Create reimbursement if paid by employee
        if expense.get("paid_using") in [PaidUsing.PERSONAL, "PERSONAL", "Personal"]:
            from repositories.reimbursement import get_reimbursement_by_expense_uuid, create_reimbursement
            from utils.ids import generate_reimbursement_id
            from bson.decimal128 import Decimal128
            from schemas.reimbursement import ReimbursementStatus
            
            existing = await get_reimbursement_by_expense_uuid(db, expense_uuid)
            if not existing:
                reimbursement_uuid = await generate_reimbursement_id(db)
                amount = expense.get("amount")
                new_reimbursement = {
                    "uuid": reimbursement_uuid,
                    "expense_uuid": expense_uuid,
                    "user_uuid": expense.get("user_uuid"),
                    "amount": amount if isinstance(amount, Decimal128) else Decimal128(str(amount)),
                    "reimbursement_status": ReimbursementStatus.PENDING,
                    "paid_by_user_uuid": None,
                    "paid_at": None,
                    "remarks": "",
                    "created_at": update_data["updated_at"],
                    "updated_at": update_data["updated_at"],
                    "is_deleted": False
                }
                await create_reimbursement(db, new_reimbursement)
        
        expense["review_status"] = ExpenseReviewStatus.APPROVED
        expense["updated_at"] = update_data["updated_at"]
        if "amount" in expense and expense["amount"] is not None:
            from decimal import Decimal
            expense["amount"] = Decimal(str(expense["amount"]))
        return expense

    @staticmethod
    async def reject_expense(expense_uuid: str, db: AsyncIOMotorDatabase):
        expense = await db["expenses"].find_one({"uuid": expense_uuid, "is_deleted": False})
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
            
        if expense.get("review_status") != ExpenseReviewStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only pending expenses can be rejected")
            
        update_data = {
            "review_status": ExpenseReviewStatus.REJECTED,
            "updated_at": int(time.time() * 1000)
        }
        await db["expenses"].update_one({"uuid": expense_uuid}, {"$set": update_data})
        
        # Soft delete any pending reimbursements
        await soft_delete_pending_reimbursement(db, expense_uuid)
        
        expense["review_status"] = ExpenseReviewStatus.REJECTED
        expense["updated_at"] = update_data["updated_at"]
        if "amount" in expense and expense["amount"] is not None:
            from decimal import Decimal
            expense["amount"] = Decimal(str(expense["amount"]))
        return expense
