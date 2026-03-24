from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Dict, Any
import shutil
import os
import numpy as np
from PIL import Image
import io
import tensorflow as tf
# Robust Keras import
try:
    from tensorflow.keras.preprocessing import image as keras_image
except ImportError:
    try:
        import keras.preprocessing.image as keras_image
    except ImportError:
        # Final fallback, maybe just keras.preprocessing?
        from keras.preprocessing import image as keras_image
import onnxruntime as ort

from models.food_recognition import get_food_model, FOOD_LABELS
from routes.food_list import FOOD_DATA

router = APIRouter(tags=["upload"])

# Load models
food_model = get_food_model()

# Load ONNX Vision Model
VISION_MODEL_PATH = "models/vision_efficientnet.onnx"
_vision_session = None

def get_vision_session():
    global _vision_session
    if _vision_session is None:
        if os.path.exists(VISION_MODEL_PATH):
            _vision_session = ort.InferenceSession(VISION_MODEL_PATH)
        else:
            print(f"Warning: {VISION_MODEL_PATH} not found.")
    return _vision_session

def preprocess_image_food(img_bytes):
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img = img.resize((224, 224))
    x = keras_image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x = x / 255.0
    return x

def preprocess_image_vision_onnx(img_bytes):
    # Vision model likely expects specific preprocessing (ImageNet stats usually)
    # Spoilix used: transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    # And scale to 224x224
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img = img.resize((224, 224))
    img_data = np.array(img).astype('float32') / 255.0
    
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    
    img_data = (img_data - mean) / std
    img_data = np.transpose(img_data, (2, 0, 1)) # HWC -> CHW for ONNX
    img_data = np.expand_dims(img_data, axis=0)
    return img_data

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...), 
    container_id: str = Form(None)
):
    contents = await file.read()
    
    # 1. Food Recognition
    x_food = preprocess_image_food(contents)
    preds = food_model.predict(x_food)
    top_idx = np.argmax(preds[0])
    food_name = FOOD_LABELS[top_idx]
    
    # 2. Vision Anomaly (Spoilix Model)
    # Using it as feature extractor as per instructions
    session = get_vision_session()
    spoilage_prob = 0.0
    vision_features = []
    
    if session:
        x_vision = preprocess_image_vision_onnx(contents)
        input_name = session.get_inputs()[0].name
        # Assuming output: [spoilage_prob, features] or similar
        # Based on Spoilix analysis: outputs[0]=freshness(0-1), [1]=spoilt_prob?
        # Re-checking Spoilix/backend/vision_service.py logic
        # "outputs = session.run(None, {input_name: input_tensor})"
        # "freshness_01 = float(outputs[0].squeeze())"
        # "spoilt_prob = float(outputs[1].squeeze())"
        # "features = outputs[2].squeeze().tolist()" <--- Wait, I need to check Spoilix code again
        
        try:
            outputs = session.run(None, {input_name: x_vision})
            # Mapping based on Spoilix/backend/vision_service.py
            # If standard outputs were [freshness, spoilt, features]
            # Wait, Spoilix Analysis:
            # "outputs[0].squeeze()" -> freshness
            # "outputs[1].squeeze()" -> spoilt_prob
            # "outputs[2].squeeze()" -> features
            if len(outputs) >= 2:
                spoilage_prob = float(outputs[0].squeeze())
                vision_features = outputs[1].squeeze().tolist()
            else:
                # Fallback
                spoilage_prob = 0.5
                vision_features = [0.0] * 512
        except Exception as e:
            print(f"Vision inference error: {e}")
            vision_features = [0.0] * 512
    
    # Update Container
    # If explicit container_id provided (from staff update), use it.
    # Otherwise, create a new unique ID.
    import uuid
    if container_id and container_id != "null":
        target_id = container_id
    else:
        target_id = f"container_{uuid.uuid4().hex[:8]}"
    
    # Calculate Freshness (Simple Logic for now, seeing as Vision is just one part)
    # real logic happens in Fusion, but here we update Vision features
    freshness = float(100.0 - (spoilage_prob * 100.0))
    
    status = "Fresh"
    if freshness < 40: status = "Spoiled"
    elif freshness < 70: status = "Warning"
    
    update_container(target_id, {
        "food_name": food_name,
        "vision_features": vision_features,
        "vision_spoilage_score": spoilage_prob,
        # We don't overwrite sensor data here, just vision
        "status": status, # simple status update based on vision only for immediate feedback
        "freshness_score": freshness 
    })
    
    # Get Nutrition
    nutrition = FOOD_DATA.get(food_name, {})
    if not nutrition:
        # Try finding key
        key = food_name.lower().replace(" ", "_")
        nutrition = FOOD_DATA.get(key, {})

    return {
        "food_name": food_name,
        "spoilage_prob": spoilage_prob,
        "vision_spoilage_score": spoilage_prob, # Frontend expects this key
        "container_id": target_id,
        "nutrition": nutrition,
        "vision_features": vision_features  # Internal use, maybe don't return to UI?
    }
