import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['finance_tracker_db']
    
    # Update PENDING to SUBMITTED
    res1 = await db.expenses.update_many(
        {'review_status': 'PENDING'},
        {'$set': {'review_status': 'SUBMITTED'}}
    )
    print(f'Updated PENDING: {res1.modified_count}')
    
    # Update APPROVED to SUBMITTED
    res2 = await db.expenses.update_many(
        {'review_status': 'APPROVED'},
        {'$set': {'review_status': 'SUBMITTED'}}
    )
    print(f'Updated APPROVED: {res2.modified_count}')
    
    # Update REJECTED to SUBMITTED
    res3 = await db.expenses.update_many(
        {'review_status': 'REJECTED'},
        {'$set': {'review_status': 'SUBMITTED'}}
    )
    print(f'Updated REJECTED: {res3.modified_count}')

if __name__ == '__main__':
    asyncio.run(run())
