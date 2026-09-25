from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, UploadFile
from typing import Optional
from schemas.expense import ExpenseCreate, ExpenseUpdate
from repositories.expense import create_expense, get_expense_by_uuid, get_expenses_by_user, update_expense, soft_delete_expense, hard_delete_expense
from utils.ids import generate_expense_id
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
            "vendor": expense_data["vendor"],
            "gst_bill": expense_data["gst_bill"],
            "payment_method": expense_data["payment_method"],
            "bill_url": bill_url,
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
            {"$sort": {"created_at": -1}}
        ]
        expenses = await db["expenses"].aggregate(pipeline).to_list(length=1000)
        for exp in expenses:
            exp.pop("_id", None)
            if "amount" in exp and exp["amount"] is not None:
                if hasattr(exp["amount"], "to_decimal"):
                    exp["amount"] = float(exp["amount"].to_decimal())
                else:
                    exp["amount"] = float(exp["amount"])
        return expenses

    @staticmethod
    async def get_snacks_summary(user_uuid: str, start_ts: int, end_ts: int, db: AsyncIOMotorDatabase):
        match_query = {
            "user_uuid": user_uuid, 
            "is_deleted": False, 
            "expense_date": {"$gte": start_ts, "$lte": end_ts}
        }
        
        pipeline = [
            {"$match": match_query},
            {"$group": {
                "_id": None,
                "total_spent": {"$sum": "$amount"}
            }}
        ]
        
        result = await db["expenses"].aggregate(pipeline).to_list(length=1)
        total_spent = 0.0
        
        if result and "total_spent" in result[0]:
            val = result[0]["total_spent"]
            if hasattr(val, "to_decimal"):
                total_spent = float(val.to_decimal())
            else:
                total_spent = float(val)

        expenses_cursor = db["expenses"].find(match_query).sort("expense_date", -1)
        expenses_list = await expenses_cursor.to_list(length=1000)
        
        for exp in expenses_list:
            if "amount" in exp and exp["amount"] is not None:
                if hasattr(exp["amount"], "to_decimal"):
                    exp["amount"] = float(exp["amount"].to_decimal())
                else:
                    exp["amount"] = float(exp["amount"])
            exp["_id"] = str(exp["_id"])
                
        return {
            "total_spent": total_spent,
            "expenses": expenses_list
        }

    @staticmethod
    async def update_expense(expense_uuid: str, expense_update: ExpenseUpdate, user_uuid: str, db: AsyncIOMotorDatabase):
        expense = await get_expense_by_uuid(db, expense_uuid, user_uuid)
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
            
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
            
        await hard_delete_expense(db, expense_uuid)
        
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
            {"$unwind": {
                "path": "$user_info",
                "preserveNullAndEmptyArrays": True
            }},
            {"$addFields": {
                "employee_name": "$user_info.name",
                "employee_email": "$user_info.email",
                "employee_phone": "$user_info.phone"
            }},
            {"$project": {
                "user_info": 0
            }}
        ]
        expenses = await db["expenses"].aggregate(pipeline).to_list(length=1000)
        for exp in expenses:
            exp.pop("_id", None)
            if "amount" in exp and exp["amount"] is not None:
                if hasattr(exp["amount"], "to_decimal"):
                    exp["amount"] = float(exp["amount"].to_decimal())
                else:
                    exp["amount"] = float(exp["amount"])
        return expenses


