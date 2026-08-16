from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_db(cls):
        cls.client = AsyncIOMotorClient(settings.MONGO_URL)
        cls.db = cls.client[settings.DATABASE_NAME]
        print("Connected to MongoDB!")

    @classmethod
    async def close_db(cls):
        if cls.client:
            cls.client.close()
            print("Closed MongoDB connection.")

    @classmethod
    def get_db(cls):
        return cls.db
