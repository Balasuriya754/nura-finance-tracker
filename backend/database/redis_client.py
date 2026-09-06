import redis.asyncio as redis
import os

class RedisClient:
    client: redis.Redis = None

    @classmethod
    async def connect_redis(cls):
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        cls.client = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        # Test connection
        await cls.client.ping()

    @classmethod
    async def close_redis(cls):
        if cls.client:
            await cls.client.close()

def get_redis():
    return RedisClient.client
