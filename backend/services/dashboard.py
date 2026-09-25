from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import Optional
import calendar

class DashboardService:
    @staticmethod
    async def get_overview_stats(
        db: AsyncIOMotorDatabase,
        start_ts: Optional[int] = None,
        end_ts: Optional[int] = None
    ) -> dict:
        def to_float(val):
            if hasattr(val, "to_decimal"):
                return float(val.to_decimal())
            return float(val)

        # Match condition for expenses based on expense_date
        expense_match = {"is_deleted": False}
        if start_ts is not None or end_ts is not None:
            expense_match["expense_date"] = {}
            if start_ts is not None:
                expense_match["expense_date"]["$gte"] = start_ts
            if end_ts is not None:
                expense_match["expense_date"]["$lte"] = end_ts

        # 1. Expenses Stats Pipeline
        expense_pipeline = [
            {"$match": expense_match},
            {"$group": {
                "_id": None,
                "total_expenses": {
                    "$sum": "$amount"
                },
                "gst_bills": {
                    "$sum": {"$cond": [{"$eq": ["$gst_bill", True]}, 1, 0]}
                },
                "non_gst_bills": {
                    "$sum": {"$cond": [{"$eq": ["$gst_bill", False]}, 1, 0]}
                }
            }}
        ]
        
        expense_res = await db["expenses"].aggregate(expense_pipeline).to_list(1)
        expense_stats = expense_res[0] if expense_res else {
            "total_expenses": 0, "gst_bills": 0, "non_gst_bills": 0
        }
        

        
        # 3. Employees who submitted in this range
        submitted_pipeline = [
            {"$match": expense_match},
            {"$group": {"_id": "$user_uuid"}}
        ]
        submitted_res = await db["expenses"].aggregate(submitted_pipeline).to_list(None)
        employees_submitted = len(submitted_res)
        
        # 4. Total Employees (usually unfiltered by date, just total active employees)
        total_employees = await db["users"].count_documents({"is_active": True})

        return {
            "total_expenses": to_float(expense_stats.get("total_expenses", 0)),
            "gst_bills_count": expense_stats.get("gst_bills", 0),
            "non_gst_bills_count": expense_stats.get("non_gst_bills", 0),
            "employees_submitted": employees_submitted,
            "total_employees": total_employees
        }

    @staticmethod
    async def get_employee_profile_stats(user_uuid: str, db: AsyncIOMotorDatabase) -> dict:
        def to_float(val):
            if hasattr(val, "to_decimal"):
                return float(val.to_decimal())
            return float(val)
            
        pipeline = [
            {"$match": {"user_uuid": user_uuid, "is_deleted": False}},
            {"$group": {
                "_id": None,
                "total_expenses": {"$sum": "$amount"},
                "total_count": {"$sum": 1}
            }}
        ]
        res = await db["expenses"].aggregate(pipeline).to_list(1)
        stats = res[0] if res else {
            "total_expenses": 0, "total_count": 0
        }



        # Fetch all expenses for this user
        expenses_cursor = db["expenses"].find({"user_uuid": user_uuid, "is_deleted": False}).sort("created_at", -1)
        expenses = await expenses_cursor.to_list(length=1000)
        for exp in expenses:
            if "amount" in exp and exp["amount"] is not None:
                from decimal import Decimal
                exp["amount"] = Decimal(str(to_float(exp["amount"])))

        return {
            "stats": {
                "total_expenses": to_float(stats.get("total_expenses", 0)),
                "total_count": stats.get("total_count", 0)
            },
            "expenses": expenses
        }
