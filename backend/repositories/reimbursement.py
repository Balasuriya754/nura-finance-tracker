from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

async def create_reimbursement(db: AsyncIOMotorDatabase, reimbursement_data: dict) -> dict:
    await db["reimbursements"].insert_one(reimbursement_data)
    return reimbursement_data

async def get_reimbursement_by_expense_uuid(db: AsyncIOMotorDatabase, expense_uuid: str) -> Optional[dict]:
    return await db["reimbursements"].find_one({"expense_uuid": expense_uuid, "is_deleted": False})

async def soft_delete_pending_reimbursement(db: AsyncIOMotorDatabase, expense_uuid: str) -> None:
    from schemas.reimbursement import ReimbursementStatus
    await db["reimbursements"].update_one(
        {"expense_uuid": expense_uuid, "reimbursement_status": ReimbursementStatus.PENDING},
        {"$set": {"is_deleted": True}}
    )
