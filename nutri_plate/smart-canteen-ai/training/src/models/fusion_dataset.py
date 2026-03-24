# src/models/fusion_dataset.py

import numpy as np
import torch
from torch.utils.data import Dataset

from .fusion_config import FUSION_FEATURES, FUSION_LABELS, TRAIN_SPLIT


class FusionDataset(Dataset):
    def __init__(self, split: str = "train"):
        assert split in ("train", "val")
        X = np.load(FUSION_FEATURES)
        y = np.load(FUSION_LABELS)

        N = X.shape[0]
        idx = np.arange(N)
        np.random.seed(42)
        np.random.shuffle(idx)
        cut = int(TRAIN_SPLIT * N)
        train_idx = idx[:cut]
        val_idx = idx[cut:]

        if split == "train":
            self.X = X[train_idx]
            self.y = y[train_idx]
        else:
            self.X = X[val_idx]
            self.y = y[val_idx]

    def __len__(self):
        return self.X.shape[0]

    def __getitem__(self, i):
        x = torch.from_numpy(self.X[i]).float()  # [640]
        y = torch.from_numpy(self.y[i]).float()  # [2]
        return x, y
