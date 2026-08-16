from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from schemas.user import UserCreate, UserResponse, SendOTPRequest, ResetPasswordRequest
from schemas.token import Token
from auth.auth_utils import verify_password, create_access_token, get_current_user_uuid, get_database
from services.user import UserService

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/send-otp")
async def send_otp(request: SendOTPRequest, db=Depends(get_database)):
    return await UserService.generate_and_send_otp(request.email, db)

@router.post("/forgot-password-otp")
async def forgot_password_otp(request: SendOTPRequest, db=Depends(get_database)):
    return await UserService.send_forgot_password_otp(request.email, db)

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db=Depends(get_database)):
    return await UserService.reset_password(request.email, request.otp, request.new_password, db)

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db=Depends(get_database)):
    return await UserService.register_user(user, db)

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_database)):
    user = await db["users"].find_one({"email": form_data.username})
    if not user:
        admin = await db["admins"].find_one({"email": form_data.username})
        if admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    if not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["uuid"], "role": "employee"})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/admin-login")
async def admin_login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_database)):
    # Look for admin in admins collection
    admin = await db["admins"].find_one({"email": form_data.username})
    
    # We will support plain text password as requested for manual compass insertion
    if not admin or admin.get("password") != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": admin["uuid"], "role": "admin"})
    admin_response = {"uuid": admin["uuid"], "name": admin.get("name", "Admin"), "email": admin["email"], "role": "admin"}
    return {"access_token": access_token, "token_type": "bearer", "user": admin_response}

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from config.settings import settings
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

@router.get("/me")
async def get_me(token: str = Depends(oauth2_scheme), db=Depends(get_database)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_uuid: str = payload.get("sub")
        role: str = payload.get("role", "employee")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
    if role == "admin":
        admin = await db["admins"].find_one({"uuid": user_uuid})
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        return {"uuid": admin["uuid"], "name": admin.get("name", "Admin"), "email": admin["email"], "role": "admin"}
    else:
        user = await db["users"].find_one({"uuid": user_uuid})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        # Ensure role is set
        user["role"] = "employee"
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
