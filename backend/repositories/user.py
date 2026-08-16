from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

async def create_user(db: AsyncIOMotorDatabase, user_data: dict) -> dict:
    await db["users"].insert_one(user_data)
    return user_data

async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[dict]:
    return await db["users"].find_one({"email": email})

async def get_user_by_uuid(db: AsyncIOMotorDatabase, uuid: str) -> Optional[dict]:
    return await db["users"].find_one({"uuid": uuid})
