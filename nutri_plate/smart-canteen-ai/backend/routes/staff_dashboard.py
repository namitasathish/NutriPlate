from fastapi import APIRouter
from database import get_all_containers

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/")
def get_dashboard_data():
    return get_all_containers()
