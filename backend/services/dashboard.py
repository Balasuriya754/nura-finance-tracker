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

        # Match condition for reimbursements based on created_at
        reimb_match = {"is_deleted": False}
        if start_ts is not None or end_ts is not None:
            reimb_match["created_at"] = {}
            if start_ts is not None:
                reimb_match["created_at"]["$gte"] = start_ts
            if end_ts is not None:
                reimb_match["created_at"]["$lte"] = end_ts

        # 1. Expenses Stats Pipeline
        expense_pipeline = [
            {"$match": expense_match},
            {"$group": {
                "_id": None,
                "total_expenses": {
                    "$sum": {"$cond": [{"$in": ["$review_status", ["PENDING", "APPROVED"]]}, "$amount", 0]}
                },
                "pending_reviews": {
                    "$sum": {"$cond": [{"$eq": ["$review_status", "PENDING"]}, 1, 0]}
                },
                "approved_expenses": {
                    "$sum": {"$cond": [{"$eq": ["$review_status", "APPROVED"]}, 1, 0]}
                },
                "rejected_expenses": {
                    "$sum": {"$cond": [{"$eq": ["$review_status", "REJECTED"]}, 1, 0]}
                },
                "company_paid": {
                    "$sum": {"$cond": [{"$and": [{"$in": ["$review_status", ["PENDING", "APPROVED"]]}, {"$eq": ["$paid_using", "COMPANY"]}]}, "$amount", 0]}
                },
                "personal_paid": {
                    "$sum": {"$cond": [{"$and": [{"$in": ["$review_status", ["PENDING", "APPROVED"]]}, {"$eq": ["$paid_using", "PERSONAL"]}]}, "$amount", 0]}
                },
                "gst_bills": {
                    "$sum": {"$cond": [{"$and": [{"$in": ["$review_status", ["PENDING", "APPROVED"]]}, {"$eq": ["$gst_bill", True]}]}, 1, 0]}
                },
                "non_gst_bills": {
                    "$sum": {"$cond": [{"$and": [{"$in": ["$review_status", ["PENDING", "APPROVED"]]}, {"$eq": ["$gst_bill", False]}]}, 1, 0]}
                }
            }}
        ]
        
        expense_res = await db["expenses"].aggregate(expense_pipeline).to_list(1)
        expense_stats = expense_res[0] if expense_res else {
            "total_expenses": 0, "pending_reviews": 0, "approved_expenses": 0, 
            "rejected_expenses": 0, "company_paid": 0, "personal_paid": 0,
            "gst_bills": 0, "non_gst_bills": 0
        }
        
        # 2. Reimbursements Stats Pipeline
        reimb_pipeline = [
            {"$match": reimb_match},
            {"$group": {
                "_id": None,
                "pending_reimbursements": {
                    "$sum": {"$cond": [{"$eq": ["$reimbursement_status", "PENDING"]}, "$amount", 0]}
                },
                "total_reimbursed_amount": {
                    "$sum": {"$cond": [{"$eq": ["$reimbursement_status", "COMPLETED"]}, "$amount", 0]}
                }
            }}
        ]
        reimb_res = await db["reimbursements"].aggregate(reimb_pipeline).to_list(1)
        reimb_stats = reimb_res[0] if reimb_res else {
            "pending_reimbursements": 0, "total_reimbursed_amount": 0
        }
        
        # 3. Employees who submitted in this range (non-draft)
        submitted_pipeline = [
            {"$match": {**expense_match, "review_status": {"$ne": "DRAFT"}}},
            {"$group": {"_id": "$user_uuid"}}
        ]
        submitted_res = await db["expenses"].aggregate(submitted_pipeline).to_list(None)
        employees_submitted = len(submitted_res)
        
        # 4. Total Employees (usually unfiltered by date, just total active employees)
        total_employees = await db["users"].count_documents({"is_active": True})

        return {
            "total_expenses": to_float(expense_stats.get("total_expenses", 0)),
            "pending_reviews": expense_stats.get("pending_reviews", 0),
            "approved_expenses": expense_stats.get("approved_expenses", 0),
            "rejected_expenses": expense_stats.get("rejected_expenses", 0),
            "company_paid_expenses": to_float(expense_stats.get("company_paid", 0)),
            "personal_paid_expenses": to_float(expense_stats.get("personal_paid", 0)),
            "gst_bills_count": expense_stats.get("gst_bills", 0),
            "non_gst_bills_count": expense_stats.get("non_gst_bills", 0),
            "pending_reimbursements": to_float(reimb_stats.get("pending_reimbursements", 0)),
            "total_reimbursed_amount": to_float(reimb_stats.get("total_reimbursed_amount", 0)),
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
                "approved": {"$sum": {"$cond": [{"$eq": ["$review_status", "APPROVED"]}, 1, 0]}},
                "rejected": {"$sum": {"$cond": [{"$eq": ["$review_status", "REJECTED"]}, 1, 0]}},
                "pending": {"$sum": {"$cond": [{"$eq": ["$review_status", "PENDING"]}, 1, 0]}},
                "personal_payments": {"$sum": {"$cond": [{"$eq": ["$paid_using", "PERSONAL"]}, "$amount", 0]}},
                "company_payments": {"$sum": {"$cond": [{"$eq": ["$paid_using", "COMPANY"]}, "$amount", 0]}}
            }}
        ]
        res = await db["expenses"].aggregate(pipeline).to_list(1)
        stats = res[0] if res else {
            "total_expenses": 0, "approved": 0, "rejected": 0, "pending": 0, "personal_payments": 0, "company_payments": 0
        }

        reimb_pipeline = [
            {"$match": {"user_uuid": user_uuid, "is_deleted": False}},
            {"$group": {
                "_id": None,
                "pending_reimbursements": {"$sum": {"$cond": [{"$eq": ["$reimbursement_status", "PENDING"]}, "$amount", 0]}},
                "completed_reimbursements": {"$sum": {"$cond": [{"$eq": ["$reimbursement_status", "COMPLETED"]}, "$amount", 0]}}
            }}
        ]
        reimb_res = await db["reimbursements"].aggregate(reimb_pipeline).to_list(1)
        reimb_stats = reimb_res[0] if reimb_res else {
            "pending_reimbursements": 0, "completed_reimbursements": 0
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
                "approved_count": stats.get("approved", 0),
                "rejected_count": stats.get("rejected", 0),
                "pending_count": stats.get("pending", 0),
                "personal_payments": to_float(stats.get("personal_payments", 0)),
                "company_payments": to_float(stats.get("company_payments", 0)),
                "pending_reimbursements": to_float(reimb_stats.get("pending_reimbursements", 0)),
                "completed_reimbursements": to_float(reimb_stats.get("completed_reimbursements", 0))
            },
            "expenses": expenses
        }
