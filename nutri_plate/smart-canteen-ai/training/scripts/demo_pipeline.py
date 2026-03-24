# scripts/demo_pipeline.py

import base64
import json
import argparse
from pathlib import Path
import random
from typing import List, Dict, Any, Optional
import numpy as np
import h5py
import requests

BASE_URL = "http://127.0.0.1:8000"

# File paths for real preprocessed training data
data_dir = Path(__file__).resolve().parent.parent / 'data' / 'sensor_processed'
TRAIN_H5 = data_dir / 'sensor_sequences_train.h5'
TRAIN_LABELS = data_dir / 'labels_train.npy'


def get_real_fresh_sensor_sequence() -> Dict[str, float]:
    """
    Load a random fresh example from the preprocessed training set (freshness > 80).
    Returns a single sensor dict (with keys matching schema), taken from a random timestep in this real window.
    """
    with h5py.File(str(TRAIN_H5), "r") as f:
        X = f["X"][:]
    y = np.load(str(TRAIN_LABELS))
    # Find indices with high freshness
    fresh_indices = np.where(y[:, 0] > 80)[0]
    if len(fresh_indices) == 0:
        raise RuntimeError("No fresh samples found in label file.")
    idx = random.choice(fresh_indices)
    window = X[idx]  # shape [60,8]
    feature_names = ["NH3", "H2S", "CH4", "alcohol", "VOC", "H2", "temperature", "humidity"]
    mean_step = window.mean(axis=0)
    return {k: float(mean_step[i]) for i, k in enumerate(feature_names)}

def get_real_spoiled_sensor_sequence() -> Dict[str, float]:
    """
    Load a random spoiled example from the preprocessed training set.
    Tries a default threshold first; if none found, falls back to the lowest-freshness samples available.
    Returns a single sensor dict (with keys matching schema), taken from a random timestep in this real window.
    """
    with h5py.File(str(TRAIN_H5), "r") as f:
        X = f["X"][:]
    y = np.load(str(TRAIN_LABELS))
    feature_names = ["NH3", "H2S", "CH4", "alcohol", "VOC", "H2", "temperature", "humidity"]

    def pick_spoiled(threshold: float) -> Optional[Dict[str, float]]:
        spoiled_indices = np.where(y[:, 0] < threshold)[0]
        if len(spoiled_indices) == 0:
            return None
        idx_local = random.choice(spoiled_indices)
        window_local = X[idx_local]  # shape [60,8]
        mean_step_local = window_local.mean(axis=0)
        return {k: float(mean_step_local[i]) for i, k in enumerate(feature_names)}

    # Try default threshold first
    result = pick_spoiled(30.0)
    if result is not None:
        return result

    # Fallback: use lowest-freshness samples available (pick among the lowest 1% or min value)
    freshness = y[:, 0]
    min_freshness = float(freshness.min())
    # pick within min_freshness + tiny epsilon to grab the lowest bin
    epsilon = 1e-3
    spoiled_indices = np.where(freshness <= min_freshness + epsilon)[0]
    if len(spoiled_indices) == 0:
        raise RuntimeError("No spoiled samples found in label file (even at minimum freshness).")
    idx = random.choice(spoiled_indices)
    window = X[idx]  # shape [60,8]
    mean_step = window.mean(axis=0)
    return {k: float(mean_step[i]) for i, k in enumerate(feature_names)}


def get_user_sensor_input() -> Dict[str, float]:
    """Get sensor input from user with validation."""
    sensors = {
        "NH3": (0, 1000, "Ammonia (ppm)"),
        "H2S": (0, 500, "Hydrogen Sulfide (ppb)"),
        "CH4": (0, 5000, "Methane (ppm)"),
        "alcohol": (0, 1000, "Alcohol (ppm)"),
        "VOC": (0, 1000, "Volatile Organic Compounds (ppb)"),
        "H2": (0, 1000, "Hydrogen (ppm)"),
        "temperature": (-20, 50, "Temperature (°C)"),
        "humidity": (0, 100, "Humidity (%)")
    }
    
    print("\n=== Enter Sensor Values ===")
    readings = {}
    for sensor, (min_val, max_val, desc) in sensors.items():
        while True:
            try:
                value = float(input(f"{desc} [{min_val}-{max_val}]: "))
                if min_val <= value <= max_val:
                    readings[sensor] = value
                    break
                print(f"Please enter a value between {min_val} and {max_val}")
            except ValueError:
                print("Please enter a valid number")
    return readings


def build_sensor_window(sensor_values: Dict[str, float], window_size: int = 60) -> List[Dict[str, float]]:
    """
    Create a window of identical sensor readings from the current reading (NO random variation).
    This matches the format expected by the backend and ensures consistency with training if user wants to test a static value.
    """
    return [
        {**sensor_values, "timestamp": i} for i in range(window_size)
    ]

def image_to_base64(path: Path) -> str:
    data = path.read_bytes()
    return base64.b64encode(data).decode("utf-8")

def select_image(folder_path: Path) -> Optional[Path]:
    """Let user select an image from the given folder."""
    image_files = list(folder_path.glob("*.jpg")) + list(folder_path.glob("*.png"))
    if not image_files:
        print(f"No image files found in {folder_path}")
        return None

    print("\nAvailable images:")
    for i, img in enumerate(image_files, 1):
        print(f"{i}. {img.name}")

    while True:
        try:
            choice = input(f"\nSelect an image (1-{len(image_files)}), or 'r' for random: ").strip().lower()
            if choice == 'r':
                return random.choice(image_files)
            choice = int(choice)
            if 1 <= choice <= len(image_files):
                return image_files[choice - 1]
            print(f"Please enter a number between 1 and {len(image_files)} or 'r'")
        except ValueError:
            print("Please enter a valid number or 'r'")

def call_fusion_demo(image_path: Optional[Path] = None, folder_path: Optional[Path] = None):
    # Select image
    if folder_path:
        selected_image = select_image(folder_path)
        if not selected_image:
            return
    elif image_path:
        selected_image = image_path
    else:
        default_folder = Path("data/dataset/spoiled_vegetables")
        selected_image = select_image(default_folder) if default_folder.exists() else None
        if not selected_image:
            return

    print(f"\nSelected image: {selected_image}")

    # Determine if the image is from a fresh or spoiled folder
    is_fresh = False
    is_spoiled = False
    if selected_image is not None:
        parent_name = selected_image.parent.name.lower()
        if parent_name.startswith("fresh_"):
            is_fresh = True
        elif parent_name.startswith("spoiled_"):
            is_spoiled = True

    # Get sensor input (automatic for fresh/spoiled if detected, else prompt)
    if is_fresh:
        print("\nAuto-selected REAL FRESH sensor sequence from training data.")
        sensor_values = get_real_fresh_sensor_sequence()
    elif is_spoiled:
        print("\nAuto-selected REAL SPOILED sensor sequence from training data.")
        sensor_values = get_real_spoiled_sensor_sequence()
    else:
        print("\n=== Sensor Input ===")
        print("Enter values for the most recent sensor reading:")
        sensor_values = get_user_sensor_input()
    
    # Create a window of sensor data
    sensor_window = build_sensor_window(sensor_values)
    image_b64 = image_to_base64(selected_image)

    payload = {
        "image_base64": image_b64,
        "readings": sensor_window,
    }

    print("\n=== Sending to Spoilix Model ===")
    try:
        resp = requests.post(f"{BASE_URL}/fusion-predict", json=payload, timeout=10)
        result = resp.json()
        print("\n=== Results ===")
        print(f"Status: {resp.status_code}")
        print(f"Final Freshness: {result.get('final_freshness', 'N/A'):.1f}%")
        print(f"Spoilage Detected: {'Yes' if result.get('spoilt') else 'No'}")
        print(f"Confidence: {result.get('confidence', 0):.1%}")
        print(f"\nDetails: {result.get('reason', 'No details available')}")
    except requests.exceptions.RequestException as e:
        print(f"\nError connecting to the server: {e}")
        print("Make sure the FastAPI server is running with: uvicorn backend.main:app --reload")

if __name__ == "__main__":
    print("=== Spoilix Food Freshness Detection ===")
    print("This demo analyzes food freshness using computer vision and sensor data.\n")
    parser = argparse.ArgumentParser(description='Run Spoilix demo pipeline')
    parser.add_argument('--image', type=str, help='Path to a specific image file')
    parser.add_argument('--folder', type=str, help='Path to a folder containing images')
    args = parser.parse_args()

    try:
        if args.image:
            image_path = Path(args.image)
            if not image_path.exists():
                print(f"Error: Image file not found: {args.image}")
                exit(1)
            call_fusion_demo(image_path=image_path)
        elif args.folder:
            folder_path = Path(args.folder)
            if not folder_path.is_dir():
                print(f"Error: Folder not found: {args.folder}")
                exit(1)
            call_fusion_demo(folder_path=folder_path)
        else:
            # Default behavior
            call_fusion_demo()
    except KeyboardInterrupt:
        print("\nDemo cancelled by user.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")
