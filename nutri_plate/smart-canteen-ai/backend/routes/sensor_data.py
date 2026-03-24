from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
import onnxruntime as ort
import os

from database import update_container, get_container, get_all_containers
from fusion_logic import run_fusion

router = APIRouter(prefix="/sensor", tags=["sensor"])

SENSOR_MODEL_PATH = "models/bilstm_sensor.onnx"
_sensor_session = None

def get_sensor_session():
    global _sensor_session
    if _sensor_session is None:
        if os.path.exists(SENSOR_MODEL_PATH):
            _sensor_session = ort.InferenceSession(SENSOR_MODEL_PATH)
        else:
            print(f"Warning: {SENSOR_MODEL_PATH} not found.")
    return _sensor_session

class SensorReading(BaseModel):
    NH3: float
    H2S: float
    CH4: float
    alcohol: float
    VOC: float
    H2: float
    temperature: float
    humidity: float

class SensorRequest(BaseModel):
    container_id: str
    readings: List[SensorReading]

@router.post("/")
def receive_sensor_data(payload: SensorRequest):
    # Process inputs (similar to Spoilix sensor_service.py)
    # Spoilix expected window of readings.
    # We will assume payload.readings is the window.
    
    session = get_sensor_session()
    sensor_features = [0.0] * 128
    sensor_score = 0.0
    
    if session and payload.readings:
        # Convert to array [1, T, 8]
        # Spoilix scaling was done by `scaler.pkl`. We don't have it easily accessible 
        # (it's a pickle, might depend on sklearn version).
        # We will do simple normalization (MinMax heuristic) or try to load pickle if possible.
        # But for robustness, we'll skip complex scaling or implement a basic one.
        # Spoilix `_sensor_window_to_array` used normalization.
        
        data = [[r.NH3, r.H2S, r.CH4, r.alcohol, r.VOC, r.H2, r.temperature, r.humidity] for r in payload.readings]
        inp = np.array(data, dtype=np.float32)
        
        # Pad/Truncate to expected window length 
        target_len = 30
        if len(inp) < target_len:
            pad = np.zeros((target_len - len(inp), 8), dtype=np.float32)
            inp = np.concatenate([pad, inp])
        elif len(inp) > target_len:
            inp = inp[-target_len:]
            
        # Apply standard Instance Z-Score Normalization
        # Standardizing dynamically across the 30-timestep lookback forces the model 
        # to focus on the trend (i.e. a sudden methane spike) rather than the absolute value.
        mean = np.mean(inp, axis=0)
        std = np.std(inp, axis=0) + 1e-8
        inp = (inp - mean) / std
            
        inp = np.expand_dims(inp, axis=0) # [1, T, 8]
        
        try:
            input_name = session.get_inputs()[0].name
            outputs = session.run(None, {input_name: inp})
            # Outputs: freshness_trend, sensor_spoilage_prob, features
            sensor_score = float(outputs[1].squeeze())
            sensor_features = outputs[2].squeeze().tolist()
        except Exception as e:
            print(f"Sensor Inference Failed: {e}")

    # Update Container
    container = get_container(payload.container_id)
    
    # Run Fusion
    freshness = run_fusion(
        vision_features=container["vision_features"],
        sensor_features=sensor_features,
        temperature=payload.readings[-1].temperature if payload.readings else 25.0
    )
    
    if freshness < 40:
        status = "Spoiled"
    elif freshness < 70:
        status = "Warning"
    else:
        status = "Fresh"
        
    update_container(payload.container_id, {
        "sensor_readings": [r.dict() for r in payload.readings[-1:]], # Store latest
        "freshness_score": freshness,
        "status": status,
        "sensor_score": sensor_score
    })
    
    return {"status": "updated", "freshness": freshness, "container_status": status}
