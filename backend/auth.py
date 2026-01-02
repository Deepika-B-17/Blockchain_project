from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import jwt
import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

SECRET_KEY = "supersecretkey"  # Change in production
ALGORITHM = "HS256"

# Mock Database
USERS = {
    "admin@college.edu": {"password": "password123", "role": "institution", "name": "City College"},
    "student@college.edu": {"password": "password123", "role": "student", "name": "John Doe", "wallet": "0x123..."},
    "verifier@company.com": {"password": "password123", "role": "verifier", "name": "Tech Corp"}
}

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(request: LoginRequest):
    user = USERS.get(request.email)
    if not user or user["password"] != request.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    payload = {
        "sub": request.email,
        "role": user["role"],
        "name": user["name"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "role": user["role"], 
        "username": user["name"],
        "email": request.email
    }
