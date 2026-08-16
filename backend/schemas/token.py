from pydantic import BaseModel
from schemas.user import UserResponse

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
