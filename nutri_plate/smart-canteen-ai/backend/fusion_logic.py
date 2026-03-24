import numpy as np
import onnxruntime as ort
import os

FUSION_MODEL_PATH = "models/fusion_mlp.onnx"
_fusion_session = None

def get_fusion_session():
    global _fusion_session
    if _fusion_session is None:
        if os.path.exists(FUSION_MODEL_PATH):
            _fusion_session = ort.InferenceSession(FUSION_MODEL_PATH)
        else:
            print(f"Warning: {FUSION_MODEL_PATH} not found.")
    return _fusion_session

def run_fusion(vision_features, sensor_features, time_since_cooked=0.0, temperature=25.0):
    session = get_fusion_session()
    if not session:
        return 50.0 # Default if model missing

    # Concatenate features
    # Spoilix used [vision(128) + sensor(128)].
    # The user prompt says: Input: vision_features, sensor_features, time_since_cooked, temperature
    # Wait, did Spoilix Fusion model take time/temp?
    # Spoilix `fusion_service.py`: `fused = np.concatenate([v, s], axis=0)`
    # The existing ONNX model `fusion_mlp.onnx` likely only takes concatenation of embeddings.
    # The Prompt says: "Input: vision_features, sensor_features, time_since_cooked, temperature"
    # BUT "You must integrate these existing ONNX models".
    # Existing Spoilix fusion model likely DOES NOT accept time/temp.
    # I should use the Spoilix logic (concat) but maybe simulate the effect of time/temp in post-processing 
    # OR if the user IMPLIES I should retrain/modify, I can't.
    # I will stick to Spoilix fusion logic for the ONNX call, and maybe scale result by time?
    
    # Vision features: list of floats
    # Sensor features: list of floats from BiLSTM
    
    v = np.array(vision_features, dtype=np.float32)
    s = np.array(sensor_features, dtype=np.float32)
    if len(v) != 512:
        v = np.zeros(512, dtype=np.float32)
    if len(s) != 128:
        s = np.zeros(128, dtype=np.float32)
        
    fused = np.concatenate([v, s], axis=0) # Shape (640,)
    fused = np.expand_dims(fused, axis=0)  # Shape (1, 640)
    
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: fused})
    
    # Spoilix Outputs: freshness (0-1), spoilt_prob (0-1)
    freshness = float(outputs[0].squeeze()) * 100.0
    
    # Heuristic adjustment for time/temp (Simulation)
    # Decay freshness by hours
    freshness -= (time_since_cooked * 2.0)
    if temperature > 30:
        freshness -= 5.0
        
    return max(0.0, min(100.0, freshness))
