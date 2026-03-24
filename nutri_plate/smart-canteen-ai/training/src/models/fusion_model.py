# src/models/fusion_model.py

import torch
import torch.nn as nn


class FusionMLP(nn.Module):
    """
    Input:
      x ∈ [B, 640]  (512 vision + 128 sensor)

    Outputs:
      freshness ∈ [B,1]   (0–1)
      spoilt_prob ∈ [B,1] (0–1)
    """

    def __init__(self, input_dim: int = 640, hidden1: int = 512,
                 hidden2: int = 256, dropout: float = 0.3) -> None:
        super().__init__()

        self.backbone = nn.Sequential(
            nn.Linear(input_dim, hidden1),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden1, hidden2),
            nn.ReLU(),
            nn.Dropout(dropout),
        )

        self.head_freshness = nn.Sequential(
            nn.Linear(hidden2, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid(),   # freshness in [0,1]
        )

        self.head_spoilt = nn.Sequential(
            nn.Linear(hidden2, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid(),   # spoilt_prob in [0,1]
        )

    def forward(self, x: torch.Tensor):
        h = self.backbone(x)                 # [B, hidden2]
        fres = self.head_freshness(h)        # [B,1]
        spoilt_prob = self.head_spoilt(h)    # [B,1]
        return fres, spoilt_prob
