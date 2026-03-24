# src/models/sensor_dataset.py

import h5py
import numpy as np
import torch
from torch.utils.data import Dataset

from .sensor_config import (
    H5_TRAIN,
    H5_VAL,
    LABELS_TRAIN,
    LABELS_VAL,
)


class SensorSeqDataset(Dataset):
    def __init__(self, split: str = "train"):
        assert split in ("train", "val")
        self.split = split

        if split == "train":
            h5_path = H5_TRAIN
            labels_path = LABELS_TRAIN
        else:
            h5_path = H5_VAL
            labels_path = LABELS_VAL

        self.h5_file = h5py.File(h5_path, "r")
        self.X = self.h5_file["X"]
        self.y = np.load(labels_path)

    def __len__(self):
        return self.X.shape[0]

    def __getitem__(self, idx):
        x = self.X[idx]        # [60,8]
        y = self.y[idx]        # [2] -> [freshness, spoilage_prob]
        x = torch.from_numpy(x).float()
        y = torch.from_numpy(y).float()
        return x, y

    def close(self):
        self.h5_file.close()
