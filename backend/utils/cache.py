from database.redis_client import get_redis
import json

from fastapi.encoders import jsonable_encoder

class CacheHelper:
    @staticmethod
    async def get(key: str):
        redis = get_redis()
        if not redis:
            return None
        try:
            data = await redis.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            print(f"Redis get error: {e}")
        return None

    @staticmethod
    async def set(key: str, data, ttl: int = 86400):
        redis = get_redis()
        if not redis:
            return
        try:
            encoded_data = jsonable_encoder(data)
            await redis.set(key, json.dumps(encoded_data), ex=ttl)
        except Exception as e:
            print(f"Redis set error: {e}")

    @staticmethod
    async def invalidate(key: str):
        redis = get_redis()
        if not redis:
            return
        try:
            await redis.delete(key)
        except Exception as e:
            print(f"Redis delete error: {e}")
        
    @staticmethod
    async def invalidate_pattern(pattern: str):
        redis = get_redis()
        if not redis:
            return
        try:
            keys = await redis.keys(pattern)
            if keys:
                await redis.delete(*keys)
        except Exception as e:
            print(f"Redis delete pattern error: {e}")
