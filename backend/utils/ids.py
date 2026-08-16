from motor.motor_asyncio import AsyncIOMotorDatabase
from repositories.counter import get_next_sequence_value

async def generate_user_id(db: AsyncIOMotorDatabase) -> str:
    seq = await get_next_sequence_value(db, "userid")
    return f"USR{seq:06d}"

async def generate_expense_id(db: AsyncIOMotorDatabase) -> str:
    seq = await get_next_sequence_value(db, "expenseid")
    return f"EXP{seq:06d}"

async def generate_reimbursement_id(db: AsyncIOMotorDatabase) -> str:
    seq = await get_next_sequence_value(db, "reimbursementid")
    return f"RBM{seq:06d}"
