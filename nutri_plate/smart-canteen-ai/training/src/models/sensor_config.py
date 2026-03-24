# src/models/sensor_config.py

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # Spoilix/

# raw data
DATA_DIR = ROOT / "data"
RAW_CO = DATA_DIR / "ethylene_CO.txt"
RAW_METHANE = DATA_DIR / "ethylene_methane.txt"

# processed output
PROCESSED_DIR = DATA_DIR / "sensor_processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

H5_TRAIN = PROCESSED_DIR / "sensor_sequences_train.h5"
H5_VAL = PROCESSED_DIR / "sensor_sequences_val.h5"
LABELS_TRAIN = PROCESSED_DIR / "labels_train.npy"
LABELS_VAL = PROCESSED_DIR / "labels_val.npy"
SCALER_PATH = PROCESSED_DIR / "scaler.pkl"

# time-series settings
SEQ_LEN = 60         # timesteps per window
STRIDE = 10          # hop size

TRAIN_SPLIT = 0.8

# synthetic freshness curve
TIME_SCALE = 3600.0  # sec → “spoilage hours”
K_DECAY = 0.2        # decay rate

# spoilage prob
GAS_SCALE_A = 0.1
GAS_THRESHOLD_B = 0.0

# training
BATCH_SIZE = 64
LR = 1e-3
NUM_EPOCHS = 100
PATIENCE = 10
MIN_DELTA = 1e-4

MODEL_DIR = ROOT / "models"
BEST_MODEL_PATH = MODEL_DIR / "bilstm_sensor_best.pt"
LAST_MODEL_PATH = MODEL_DIR / "bilstm_sensor_last.pt"
ONNX_PATH = MODEL_DIR / "bilstm_sensor.onnx"
