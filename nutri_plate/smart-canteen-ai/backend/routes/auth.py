from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import create_user, authenticate_user, get_health_goals, set_health_goals

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str  # "student" or "staff"


class LoginRequest(BaseModel):
    username: str
    password: str


class HealthGoalsRequest(BaseModel):
    calories: float = 2000
    protein: float = 60
    carbohydrates: float = 250
    fat: float = 65


@router.post("/register")
def register(req: RegisterRequest):
    if req.role not in ("student", "staff"):
        raise HTTPException(status_code=400, detail="Role must be 'student' or 'staff'")
    if len(req.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    user = create_user(req.username, req.password, req.role)
    if user is None:
        raise HTTPException(status_code=409, detail="Username already exists")
    return {"message": "Account created", "user": user}


@router.post("/login")
def login(req: LoginRequest):
    user = authenticate_user(req.username, req.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"message": "Login successful", "user": user}


@router.get("/health-goals/{user_id}")
def get_goals(user_id: int):
    goals = get_health_goals(user_id)
    return goals


@router.put("/health-goals/{user_id}")
def update_goals(user_id: int, req: HealthGoalsRequest):
    set_health_goals(user_id, req.dict())
    return {"message": "Health goals updated", "goals": req.dict()}
