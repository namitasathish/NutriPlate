from fastapi import APIRouter
import csv
import os
from typing import List, Dict

router = APIRouter(prefix="/foods", tags=["foods"])

# Global cache
FOOD_DATA = {}

def load_nutrition_data():
    global FOOD_DATA
    csv_path = "nutrition101.csv"
    if not os.path.exists(csv_path):
        # Fallback if running from a different working dir
        csv_path = "../nutrition101.csv"
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    with open(csv_path, 'r') as file:
        reader = csv.reader(file)
        # Skip header? Input NutriPlate/app.py skipped line 0
        for i, row in enumerate(reader):
            if i == 0:
                continue
            if len(row) < 7:
                continue
                
            name = row[1].strip()
            # Normalize name to match labels (lowercase, underscore)
            key = name.lower().replace(" ", "_")
            
            nutrition = {
                "protein": float(row[2]),
                "calcium": float(row[3]),
                "fat": float(row[4]),
                "carbohydrates": float(row[5]),
                "vitamins": float(row[6])
            }
            FOOD_DATA[key] = nutrition
            # Also store with original name just in case
            FOOD_DATA[name] = nutrition

load_nutrition_data()

@router.get("/")
def get_food_list():
    return list(FOOD_DATA.keys())

@router.get("/{food_name}")
def get_nutrition(food_name: str):
    key = food_name.lower().replace(" ", "_")
    return FOOD_DATA.get(key, FOOD_DATA.get(food_name, {}))
