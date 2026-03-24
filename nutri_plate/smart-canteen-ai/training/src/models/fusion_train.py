# src/models/fusion_train.py

import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from .fusion_config import (
    BATCH_SIZE,
    LR,
    NUM_EPOCHS,
    PATIENCE,
    MIN_DELTA,
    FUSION_BEST,
    FUSION_LAST,
)
from .fusion_dataset import FusionDataset
from .fusion_model import FusionMLP
from .fusion_early_stopping import EarlyStopping


def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def train_fusion():
    set_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Using device:", device)

    train_ds = FusionDataset(split="train")
    val_ds = FusionDataset(split="val")

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False)

    model = FusionMLP().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)

    mse = nn.MSELoss()
    bce = nn.BCELoss()

    early_stopper = EarlyStopping(
        patience=PATIENCE,
        min_delta=MIN_DELTA,
        path=FUSION_BEST,
        verbose=True,
    )

    for epoch in range(1, NUM_EPOCHS + 1):
        # ---- train ----
        model.train()
        train_loss = 0.0

        for X, y in train_loader:
            X = X.to(device)          # [B,640]
            y = y.to(device)          # [B,2] -> [:,0]=freshness (0–1), [:,1]=spoilt (0/1)

            optimizer.zero_grad()
            fres_pred, spoilt_pred, conf_pred = model(X)  # conf_pred unused in loss for now

            loss_f = mse(fres_pred.squeeze(-1), y[:, 0])
            loss_s = bce(spoilt_pred.squeeze(-1), y[:, 1])
            loss = 0.7 * loss_f + 0.3 * loss_s

            loss.backward()
            optimizer.step()

            train_loss += loss.item() * X.size(0)

        train_loss /= len(train_ds)

        # ---- validation ----
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for X, y in val_loader:
                X = X.to(device)
                y = y.to(device)

                fres_pred, spoilt_pred, conf_pred = model(X)

                loss_f = mse(fres_pred.squeeze(-1), y[:, 0])
                loss_s = bce(spoilt_pred.squeeze(-1), y[:, 1])
                loss = 0.7 * loss_f + 0.3 * loss_s

                val_loss += loss.item() * X.size(0)

        val_loss /= len(val_ds)
        print(
            f"Epoch {epoch:03d} | "
            f"train_loss={train_loss:.4f} | val_loss={val_loss:.4f}"
        )

        early_stopper(val_loss, model)
        if early_stopper.early_stop:
            print("Early stopping triggered.")
            break

    torch.save(model.state_dict(), FUSION_LAST)
    print("Training finished. Best model at:", FUSION_BEST)


if __name__ == "__main__":
    train_fusion()
