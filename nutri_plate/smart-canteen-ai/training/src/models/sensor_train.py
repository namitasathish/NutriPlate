# src/models/sensor_train.py

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import numpy as np
import random

from .sensor_config import (
    BATCH_SIZE,
    LR,
    NUM_EPOCHS,
    PATIENCE,
    MIN_DELTA,
    BEST_MODEL_PATH,
    LAST_MODEL_PATH,
)
from .sensor_dataset import SensorSeqDataset
from .sensor_model import BiLSTMSensorModel
from .sensor_early_stopping import EarlyStopping


def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def train_sensor_model():
    set_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    train_ds = SensorSeqDataset(split="train")
    val_ds = SensorSeqDataset(split="val")

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False)

    model = BiLSTMSensorModel().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)

    mse_loss = nn.MSELoss()
    bce_loss = nn.BCELoss()

    early_stopper = EarlyStopping(
        patience=PATIENCE,
        min_delta=MIN_DELTA,
        path=BEST_MODEL_PATH,
        verbose=True,
    )

    for epoch in range(1, NUM_EPOCHS + 1):
        # ---- train ----
        model.train()
        train_loss = 0.0

        for X, y in train_loader:
            X = X.to(device)          # [B,60,8]
            y = y.to(device)          # [B,2] -> [:,0]=fresh, [:,1]=prob

            optimizer.zero_grad()
            fres_pred, prob_pred, _ = model(X)

            loss_f = mse_loss(fres_pred, y[:, 0])
            loss_p = bce_loss(prob_pred, y[:, 1])
            loss = loss_f + loss_p

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
                fres_pred, prob_pred, _ = model(X)
                loss_f = mse_loss(fres_pred, y[:, 0])
                loss_p = bce_loss(prob_pred, y[:, 1])
                loss = loss_f + loss_p
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

    # save last epoch model too
    torch.save(model.state_dict(), LAST_MODEL_PATH)
    train_ds.close()
    val_ds.close()
    print("Training finished. Best model at:", BEST_MODEL_PATH)


if __name__ == "__main__":
    train_sensor_model()
