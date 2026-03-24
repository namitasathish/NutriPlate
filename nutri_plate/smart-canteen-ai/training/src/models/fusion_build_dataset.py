# src/models/fusion_build_dataset.py

import os
import random
from pathlib import Path

import h5py
import numpy as np
import torch
from PIL import Image
from torchvision import transforms

from .fusion_config import (
    FUSION_FEATURES,
    FUSION_LABELS,
    VISION_MODEL_PATH,
    SENSOR_MODEL_PATH,
    SENSOR_H5_TRAIN,
    SENSOR_LABELS_TRAIN,
    IMAGE_ROOT,
    FRESH_THRESHOLD_SPOILT,
    NH3_THRESHOLD,
    H2S_THRESHOLD,
)

from src.model_vision import VisionSpoilageNet  # adjust to your class name
from .sensor_model import BiLSTMSensorModel


def load_image_paths(root: Path):
    exts = [".jpg", ".jpeg", ".png"]
    paths = []
    for dirpath, _, filenames in os.walk(root):
        for f in filenames:
            if Path(f).suffix.lower() in exts:
                paths.append(Path(dirpath) / f)
    return paths


def build_fusion_dataset(num_samples: int = 3000):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Using device:", device)

    # ----- load vision model (Model 1) -----
    vision_model = VisionSpoilageNet(pretrained=False)
    vision_model.load_state_dict(torch.load(VISION_MODEL_PATH, map_location=device))
    vision_model.to(device)
    vision_model.eval()
    # must return (spoil_prob, features[512]) in forward

    # ----- load sensor model (Model 2) -----
    sensor_model = BiLSTMSensorModel()
    sensor_model.load_state_dict(torch.load(SENSOR_MODEL_PATH, map_location=device))
    sensor_model.to(device)
    sensor_model.eval()

    # ----- load sensor sequences -----
    sensor_h5 = h5py.File(SENSOR_H5_TRAIN, "r")
    X_sensor = sensor_h5["X"][:]                          # [N,60,8]
    y_sensor = np.load(SENSOR_LABELS_TRAIN)               # [N,2] freshness(0–1), spoil_prob
    N_sensor = X_sensor.shape[0]

    # ----- image paths & transforms -----
    image_paths = load_image_paths(IMAGE_ROOT)
    assert len(image_paths) > 0, "No images found in data/dataset/"

    tfm = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

    fusion_features = []
    fusion_labels = []

    random.seed(42)
    np.random.seed(42)

    for i in range(num_samples):
        img_path = random.choice(image_paths)
        idx_s = random.randint(0, N_sensor - 1)

        # ----- vision features -----
        img = Image.open(img_path).convert("RGB")
        x_img = tfm(img).unsqueeze(0).to(device)          # [1,3,224,224]
        with torch.no_grad():
            spoil_prob_v, feat_v = vision_model(x_img)    # [1], [1,512]
        feat_v = feat_v.squeeze(0).cpu().numpy()          # [512]

        # ----- sensor features -----
        seq = torch.from_numpy(X_sensor[idx_s]).unsqueeze(0).float().to(device)  # [1,60,8]
        freshness_label_s, _ = y_sensor[idx_s]            # 0–1
        nh3 = X_sensor[idx_s, -1, 0]                      # last timestep NH3 (scaled)
        h2s = X_sensor[idx_s, -1, 1]                      # last timestep H2S (scaled)

        with torch.no_grad():
            fres_pred_s, spoil_prob_s, feat_s = sensor_model(seq)
        feat_s = feat_s.squeeze(0).cpu().numpy()          # [128]

        # ----- labels -----
        freshness_label = float(freshness_label_s)
        spoilt_label = 1.0 if (
            freshness_label < FRESH_THRESHOLD_SPOILT
            or nh3 > NH3_THRESHOLD
            or h2s > H2S_THRESHOLD
        ) else 0.0

        fused_vec = np.concatenate([feat_v, feat_s], axis=0)  # [640]

        fusion_features.append(fused_vec)
        fusion_labels.append([freshness_label, spoilt_label])

        if (i + 1) % 500 == 0:
            print(f"Built {i+1}/{num_samples} fusion samples")

    sensor_h5.close()

    fusion_features = np.stack(fusion_features, axis=0)
    fusion_labels = np.array(fusion_labels, dtype=np.float32)

    np.save(FUSION_FEATURES, fusion_features)
    np.save(FUSION_LABELS, fusion_labels)

    print("Saved fusion dataset:")
    print("  features:", fusion_features.shape)
    print("  labels  :", fusion_labels.shape)


if __name__ == "__main__":
    build_fusion_dataset(num_samples=3000)
