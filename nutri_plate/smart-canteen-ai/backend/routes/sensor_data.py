from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import onnxruntime as ort
import os
import time

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

# ────────────────────────────────────────────
# In-memory live state for real-time hardware data
# ────────────────────────────────────────────
LIVE_CONTAINER_ID = "container_1"
MAX_HISTORY = 30  # Number of historical points for sparklines

_live_state: Dict[str, Any] = {
    "connected": False,          # True once actual sensor JSON data arrives
    "bridge_connected": False,   # True as soon as serial reader connects (even during warmup)
    "warmup": False,             # True while connected but no data yet (Arduino warmup phase)
    "latest_reading": None,
    "history": {
        "temperature": [],
        "humidity": [],
        "NH3": [],
        "H2S": [],
        "CH4": [],
        "alcohol": [],
    },
    "buffer_count": 0,
    "last_raw_time": 0.0,
    "last_ping_time": 0.0,
    "last_inference_time": 0.0,
    "last_inference_result": None,
}

# ── Baseline calibration (captured from first reading as clean-air reference) ──
_baseline: Dict[str, float] = {
    "NH3": 0.0, "H2S": 0.0, "CH4": 0.0, "alcohol": 0.0,
}
_baseline_set = False

# Stability counter — require consecutive bad readings before escalating status
_stability = {"spoiled_count": 0, "warning_count": 0}
STABILITY_REQUIRED = 2  # 2 consecutive readings for faster demo response

# ════════════════════════════════════════════
# CORE PROCESSING FUNCTIONS
# ════════════════════════════════════════════
# These are called by BOTH the HTTP route handlers AND the
# background serial_reader thread. They operate on plain dicts
# so they don't depend on Pydantic or FastAPI.
# ════════════════════════════════════════════

def process_raw_reading(reading_dict: dict) -> dict:
    """
    Process a single raw sensor reading.
    Updates in-memory live state, computes heuristic freshness,
    and persists to the database.

    Called by:
      - POST /sensor/raw   (HTTP route, from external hardware_bridge.py)
      - serial_reader.py   (background thread, direct call)

    Args:
        reading_dict: dict with keys NH3, H2S, CH4, alcohol, VOC, H2, temperature, humidity

    Returns:
        dict with status, heuristic_freshness, heuristic_status
    """
    global _live_state

    now = time.time()
    _live_state["connected"] = True
    _live_state["bridge_connected"] = True
    _live_state["warmup"] = False           # data flowing means warmup is over
    _live_state["latest_reading"] = reading_dict
    _live_state["last_raw_time"] = now
    _live_state["last_ping_time"] = now

    # Append to rolling history for sparklines
    history = _live_state["history"]
    for key in ["temperature", "humidity", "NH3", "H2S", "CH4", "alcohol"]:
        val = reading_dict.get(key, 0.0)
        history[key] = history[key][-MAX_HISTORY + 1:] + [val]

    # Increment buffer count (resets to 0 after batch inference)
    _live_state["buffer_count"] = min(_live_state["buffer_count"] + 1, 30)

    # ── Heuristic freshness from single reading (instant feedback) ──
    # Uses baseline-relative values so clean air / no food = Fresh.
    global _baseline, _baseline_set, _stability

    nh3  = reading_dict.get("NH3", 0.0)
    h2s  = reading_dict.get("H2S", 0.0)
    ch4  = reading_dict.get("CH4", 0.0)
    temp = reading_dict.get("temperature", 25.0)

    # Capture baseline from first reading (clean air reference)
    if not _baseline_set:
        _baseline = {"NH3": nh3, "H2S": h2s, "CH4": ch4, "alcohol": reading_dict.get("alcohol", 0.0)}
        _baseline_set = True
        print(f"[Baseline] Captured clean-air reference: NH3={nh3:.2f}  H2S={h2s:.2f}  CH4={ch4:.0f}")

    # Compute diffs relative to baseline (only positive changes matter)
    nh3_diff = max(0.0, nh3 - _baseline["NH3"])
    h2s_diff = max(0.0, h2s - _baseline["H2S"])
    ch4_diff = max(0.0, ch4 - _baseline["CH4"])

    score = 100.0

    # NH3 (Ammonia) — relative to baseline, demo-tuned thresholds
    if nh3_diff > 8.0:   score -= 30.0
    elif nh3_diff > 3.0: score -= float(np.clip((nh3_diff - 3.0) / 5.0 * 25.0, 0, 25))

    # H2S (Hydrogen Sulphide) — relative to baseline
    if h2s_diff > 6.0:   score -= 30.0
    elif h2s_diff > 2.0: score -= float(np.clip((h2s_diff - 2.0) / 4.0 * 25.0, 0, 25))

    # CH4 (Methane) — relative to baseline
    if ch4_diff > 1000:  score -= 15.0
    elif ch4_diff > 300: score -= float(np.clip((ch4_diff - 300) / 700 * 12.0, 0, 12))

    # Temperature (absolute — not relative)
    if temp > 40:  score -= 15
    elif temp > 33: score -= 5

    score = max(0.0, min(100.0, score))

    # ── Stability check: require consecutive bad readings ──
    if score < 40:
        _stability["spoiled_count"] += 1
        _stability["warning_count"] += 1
    elif score < 70:
        _stability["spoiled_count"] = 0
        _stability["warning_count"] += 1
    else:
        _stability["spoiled_count"] = 0
        _stability["warning_count"] = 0

    if _stability["spoiled_count"] >= STABILITY_REQUIRED:
        heuristic_status = "Spoiled"
    elif _stability["warning_count"] >= STABILITY_REQUIRED:
        heuristic_status = "Warning"
    else:
        heuristic_status = "Fresh"

    try:
        update_container(LIVE_CONTAINER_ID, {
            "sensor_readings": [reading_dict],
            "freshness_score": score,
            "status": heuristic_status,
        })
    except Exception as e:
        print(f"DB update error in process_raw_reading: {e}")

    return {"status": "ok", "heuristic_freshness": round(score, 1), "heuristic_status": heuristic_status}


def process_sensor_batch(container_id: str, readings: list) -> dict:
    """
    Process a batch of sensor readings for BiLSTM inference + fusion.

    Called by:
      - POST /sensor/       (HTTP route, from external hardware_bridge.py)
      - serial_reader.py    (background thread, direct call)

    Args:
        container_id: e.g. "container_1"
        readings: list of dicts, each with NH3, H2S, CH4, alcohol, VOC, H2, temperature, humidity

    Returns:
        dict with status, freshness, container_status
    """
    session = get_sensor_session()
    sensor_features = [0.0] * 128
    sensor_score = 0.0
    sensor_inference_ok = False

    if session and readings:
        data = [[r["NH3"], r["H2S"], r["CH4"], r["alcohol"],
                 r.get("VOC", 0.0), r.get("H2", 0.0),
                 r["temperature"], r["humidity"]] for r in readings]
        inp = np.array(data, dtype=np.float32)

        # Pad/Truncate to expected window length
        # The BiLSTM ONNX model was trained with 60 timesteps
        target_len = 60
        if len(inp) < target_len:
            pad = np.zeros((target_len - len(inp), 8), dtype=np.float32)
            inp = np.concatenate([pad, inp])
        elif len(inp) > target_len:
            inp = inp[-target_len:]

        # Instance Z-Score Normalization
        mean = np.mean(inp, axis=0)
        std = np.std(inp, axis=0) + 1e-8
        inp = (inp - mean) / std

        inp = np.expand_dims(inp, axis=0)  # [1, T, 8]

        try:
            input_name = session.get_inputs()[0].name
            outputs = session.run(None, {input_name: inp})
            sensor_score = float(outputs[1].squeeze())
            sensor_features = outputs[2].squeeze().tolist()
            sensor_inference_ok = True
        except Exception as e:
            print(f"Sensor Inference Failed: {e}")

    # Get existing container data (for vision features)
    container = get_container(container_id)

    if sensor_inference_ok:
        # Run Fusion (vision + sensor) — only if sensor inference succeeded
        freshness = run_fusion(
            vision_features=container["vision_features"],
            sensor_features=sensor_features,
            temperature=readings[-1]["temperature"] if readings else 25.0
        )

        if freshness < 40:   status = "Spoiled"
        elif freshness < 70: status = "Warning"
        else:                status = "Fresh"
    else:
        # Sensor inference failed — keep the existing heuristic score from /sensor/raw
        # Don't overwrite a good heuristic with garbage fusion output
        freshness = container.get("freshness_score", 100.0)
        status = container.get("status", "Fresh")
        print(f"[AI] Sensor inference failed — keeping heuristic: {freshness:.0f}% ({status})")

    update_container(container_id, {
        "sensor_readings": [readings[-1]] if readings else [],
        "freshness_score": freshness,
        "status": status,
        "sensor_score": sensor_score
    })

    # If this is the live container, update live state with inference results
    if container_id == LIVE_CONTAINER_ID:
        _live_state["last_inference_time"] = time.time()
        _live_state["buffer_count"] = 0  # Reset buffer after inference
        _live_state["last_inference_result"] = {
            "freshness": freshness,
            "status": status,
            "sensor_score": sensor_score,
        }

    return {"status": "updated", "freshness": freshness, "container_status": status}


# ════════════════════════════════════════════
# HTTP ROUTE HANDLERS
# ════════════════════════════════════════════
# These are thin wrappers around the core processing functions.
# They accept Pydantic models from HTTP and delegate to the functions above.
# ════════════════════════════════════════════

# ────────────────────────────────────────────
# POST /sensor/ping — Called by bridge immediately on USB connect
# ────────────────────────────────────────────
@router.post("/ping")
def receive_bridge_ping():
    """
    Called by hardware_bridge.py or serial_reader when the serial port opens.
    Allows the frontend to show 'Warming Up' rather than 'Disconnected'.
    """
    global _live_state
    now = time.time()
    _live_state["bridge_connected"] = True
    _live_state["last_ping_time"] = now
    if _live_state["latest_reading"] is None:
        _live_state["warmup"] = True
    return {"status": "ok", "bridge_connected": True}

# ────────────────────────────────────────────
# POST /sensor/raw — Individual reading (HTTP wrapper)
# ────────────────────────────────────────────
@router.post("/raw")
def receive_raw_reading(reading: SensorReading):
    """HTTP endpoint wrapper around process_raw_reading."""
    return process_raw_reading(reading.dict())

# ────────────────────────────────────────────
# GET /sensor/live — Frontend polling endpoint
# ────────────────────────────────────────────
@router.get("/live")
def get_live_data():
    """
    Returns the current live hardware state for the frontend.
    Includes raw readings, history for sparklines, buffer progress,
    and the latest processed container data from the database.
    """
    now = time.time()

    # Bridge disconnects if no ping or data in 150s
    last_contact = max(_live_state["last_ping_time"], _live_state["last_raw_time"])
    if last_contact > 0 and (now - last_contact) > 150:
        _live_state["bridge_connected"] = False
        _live_state["warmup"] = False

    # Data connection expires if no reading in 60s
    if _live_state["last_raw_time"] > 0 and (now - _live_state["last_raw_time"]) > 60:
        _live_state["connected"] = False

    # Get the processed container data from DB
    try:
        container = get_container(LIVE_CONTAINER_ID)
    except Exception:
        container = None

    return {
        "connected": _live_state["connected"],
        "bridge_connected": _live_state["bridge_connected"],
        "warmup": _live_state["warmup"],
        "latest_reading": _live_state["latest_reading"],
        "history": _live_state["history"],
        "buffer_count": _live_state["buffer_count"],
        "container": container,
        "last_inference_time": _live_state["last_inference_time"],
        "last_inference_result": _live_state["last_inference_result"],
    }

# ────────────────────────────────────────────
# POST /sensor/ — Batch sensor data (HTTP wrapper)
# ────────────────────────────────────────────
@router.post("/")
def receive_sensor_data(payload: SensorRequest):
    """HTTP endpoint wrapper around process_sensor_batch."""
    readings_dicts = [r.dict() for r in payload.readings]
    return process_sensor_batch(payload.container_id, readings_dicts)
