# src/models/fusion_early_stopping.py

import numpy as np
import torch


class EarlyStopping:
    def __init__(self, patience=10, min_delta=0.0, path=None, verbose=True):
        self.patience = patience
        self.min_delta = min_delta
        self.path = path
        self.verbose = verbose

        self.best_loss = np.inf
        self.counter = 0
        self.early_stop = False

    def __call__(self, val_loss, model):
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
            if self.path is not None:
                torch.save(model.state_dict(), self.path)
                if self.verbose:
                    print(f"[EarlyStopping] val_loss improved to {val_loss:.4f}, saving.")
        else:
            self.counter += 1
            if self.verbose:
                print(f"[EarlyStopping] no improvement ({self.counter}/{self.patience}).")
            if self.counter >= self.patience:
                self.early_stop = True
