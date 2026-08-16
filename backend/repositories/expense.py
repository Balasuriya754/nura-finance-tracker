from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional

async def create_expense(db: AsyncIOMotorDatabase, expense_data: dict) -> dict:
    await db["expenses"].insert_one(expense_data)
    return expense_data

async def get_expense_by_uuid(db: AsyncIOMotorDatabase, uuid: str, user_uuid: str) -> Optional[dict]:
    return await db["expenses"].find_one({"uuid": uuid, "user_uuid": user_uuid, "is_deleted": False})

async def get_expenses_by_user(db: AsyncIOMotorDatabase, user_uuid: str) -> List[dict]:
    cursor = db["expenses"].find({"user_uuid": user_uuid, "is_deleted": False}).sort("created_at", -1)
    return await cursor.to_list(length=1000)

async def update_expense(db: AsyncIOMotorDatabase, uuid: str, update_data: dict) -> None:
    await db["expenses"].update_one({"uuid": uuid}, {"$set": update_data})

async def soft_delete_expense(db: AsyncIOMotorDatabase, uuid: str) -> None:
    await db["expenses"].update_one({"uuid": uuid}, {"$set": {"is_deleted": True}})
