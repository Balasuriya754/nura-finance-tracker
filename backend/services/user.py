from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from schemas.user import UserCreate
from repositories.user import get_user_by_email, create_user
from utils.ids import generate_user_id
from auth.auth_utils import get_password_hash
import time

class UserService:
    @staticmethod
    async def generate_and_send_otp(email: str, db: AsyncIOMotorDatabase) -> dict:
        import random
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
        from config.settings import settings
        
        # Check if email is already used by a normal user
        existing_user = await get_user_by_email(db, email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        # Check if email is reserved by an admin
        existing_admin = await db["admins"].find_one({"email": email})
        if existing_admin:
            raise HTTPException(status_code=400, detail="This email is reserved for administrators")
            
        otp = str(random.randint(1000, 9999))
        now = int(time.time() * 1000)
        expires_at = now + 10 * 60 * 1000 # 10 mins expiration
        
        await db["otps"].update_one(
            {"email": email},
            {"$set": {"otp": otp, "expires_at": expires_at}},
            upsert=True
        )
        
        conf = ConnectionConfig(
            MAIL_USERNAME=settings.EMAIL_USER,
            MAIL_PASSWORD=settings.EMAIL_PASS,
            MAIL_FROM=settings.EMAIL_USER,
            MAIL_PORT=settings.SMTP_PORT,
            MAIL_SERVER=settings.SMTP_SERVER,
            MAIL_STARTTLS=False,
            MAIL_SSL_TLS=True,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True
        )
        
        html = f"<p>Your OTP for registration is: <strong>{otp}</strong></p>"
        message = MessageSchema(
            subject="Your OTP for Finance Tracker Registration",
            recipients=[email],
            body=html,
            subtype=MessageType.html
        )
        
        fm = FastMail(conf)
        try:
            await fm.send_message(message)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
            
        return {"message": "OTP sent successfully"}

    @staticmethod
    async def register_user(user: UserCreate, db: AsyncIOMotorDatabase) -> dict:
        # Check if email is already used by a normal user
        existing_user = await get_user_by_email(db, user.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        # Check if email is reserved by an admin
        existing_admin = await db["admins"].find_one({"email": user.email})
        if existing_admin:
            raise HTTPException(status_code=400, detail="This email is reserved for administrators")

        now = int(time.time() * 1000)
        
        # Verify OTP
        otp_record = await db["otps"].find_one({"email": user.email})
        if not otp_record or otp_record["otp"] != user.otp or otp_record["expires_at"] < now:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

        user_uuid = await generate_user_id(db)
        
        new_user = {
            "uuid": user_uuid,
            "name": user.name,
            "email": user.email,
            "password_hash": get_password_hash(user.password),
            "phone": user.phone,
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        
        result = await create_user(db, new_user)
        
        # Delete OTP after successful registration
        await db["otps"].delete_one({"email": user.email})
        
        return result

    @staticmethod
    async def get_all_users(db: AsyncIOMotorDatabase):
        pipeline = [
            {"$lookup": {
                "from": "expenses",
                "let": {"user_uuid": "$uuid"},
                "pipeline": [
                    {"$match": {
                        "$expr": {"$eq": ["$user_uuid", "$$user_uuid"]},
                        "is_deleted": False
                    }}
                ],
                "as": "user_expenses"
            }},
            {"$lookup": {
                "from": "reimbursements",
                "let": {"user_uuid": "$uuid"},
                "pipeline": [
                    {"$match": {
                        "$expr": {"$eq": ["$user_uuid", "$$user_uuid"]},
                        "is_deleted": False
                    }}
                ],
                "as": "user_reimbursements"
            }},
            {"$addFields": {
                "total_expenses_amount": {
                    "$reduce": {
                        "input": "$user_expenses",
                        "initialValue": 0,
                        "in": {"$add": ["$$value", {"$cond": [{"$isNumber": "$$this.amount"}, "$$this.amount", 0]}]}
                    }
                },
                "pending_reviews_count": {
                    "$size": {
                        "$filter": {
                            "input": "$user_expenses",
                            "as": "exp",
                            "cond": {"$eq": ["$$exp.review_status", "PENDING"]}
                        }
                    }
                },
                "pending_reimbursements_amount": {
                    "$reduce": {
                        "input": {
                            "$filter": {
                                "input": "$user_reimbursements",
                                "as": "reimb",
                                "cond": {"$eq": ["$$reimb.reimbursement_status", "PENDING"]}
                            }
                        },
                        "initialValue": 0,
                        "in": {"$add": ["$$value", {"$cond": [{"$isNumber": "$$this.amount"}, "$$this.amount", 0]}]}
                    }
                }
            }},
            {"$project": {
                "user_expenses": 0,
                "user_reimbursements": 0
            }},
            {"$sort": {"created_at": -1}}
        ]
        
        users = await db["users"].aggregate(pipeline).to_list(length=1000)
        
        # Convert Decimal128 to float for Pydantic (or let pydantic handle it)
        for u in users:
            if hasattr(u.get("total_expenses_amount", 0), "to_decimal"):
                u["total_expenses_amount"] = float(u["total_expenses_amount"].to_decimal())
            if hasattr(u.get("pending_reimbursements_amount", 0), "to_decimal"):
                u["pending_reimbursements_amount"] = float(u["pending_reimbursements_amount"].to_decimal())
                
        return users
