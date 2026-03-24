# src/models/fusion_config.py

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # Spoilix root

# ----- data paths -----
DATA_DIR = ROOT / "data"
FUSION_DIR = DATA_DIR / "fusion"
FUSION_DIR.mkdir(parents=True, exist_ok=True)

FUSION_FEATURES = FUSION_DIR / "fusion_features.npy"
FUSION_LABELS = FUSION_DIR / "fusion_labels.npy"

# existing model weights (PyTorch) for feature extraction
VISION_MODEL_PATH = ROOT / "models" / "vision_efficientnet.pt"
SENSOR_MODEL_PATH = ROOT / "models" / "bilstm_sensor_best.pt"

# sensor processed data (for sampling windows)
SENSOR_H5_TRAIN = DATA_DIR / "sensor_processed" / "sensor_sequences_train.h5"
SENSOR_LABELS_TRAIN = DATA_DIR / "sensor_processed" / "labels_train.npy"

# vision images root
IMAGE_ROOT = DATA_DIR / "dataset"

# fusion training hyperparams
BATCH_SIZE = 64
LR = 1e-3
NUM_EPOCHS = 100
PATIENCE = 10
MIN_DELTA = 1e-4
TRAIN_SPLIT = 0.8  # fusion rows train/val split

# fusion model paths
MODEL_DIR = ROOT / "models"
FUSION_BEST = MODEL_DIR / "fusion_mlp_best.pt"
FUSION_LAST = MODEL_DIR / "fusion_mlp_last.pt"
FUSION_ONNX = MODEL_DIR / "fusion_mlp.onnx"

# label scaling and thresholds
FRESH_THRESHOLD_SPOILT = 0.4  # freshness<0.4 → spoilt
NH3_THRESHOLD = 0.8           # assuming scaled NH3 in [0,1]
H2S_THRESHOLD = 0.8
