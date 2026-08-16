from motor.motor_asyncio import AsyncIOMotorDatabase

async def get_next_sequence_value(db: AsyncIOMotorDatabase, sequence_name: str) -> int:
    sequence_document = await db["counters"].find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=True
    )
    return sequence_document["sequence_value"]
