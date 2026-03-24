# src/models/sensor_model.py

import torch
import torch.nn as nn


class BiLSTMSensorModel(nn.Module):
    """
    Input:  x ∈ [B, 60, 8]
    Outputs:
      freshness_trend ∈ [B]       (0–100)
      spoilage_prob   ∈ [B]       (0–1)
      sensor_features ∈ [B,128]   (for fusion later)
    """
    def __init__(self, input_dim=8, hidden_dim=128, num_layers=2, dropout=0.3):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout,
            bidirectional=True,
        )

        # LSTM output dim = 2 * hidden_dim (bidirectional)
        self.feature_dim = hidden_dim  # want 128‑dim features
        self.proj_features = nn.Linear(2 * hidden_dim, self.feature_dim)

        self.head_freshness = nn.Sequential(
            nn.Linear(self.feature_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
        )

        self.head_spoilage = nn.Sequential(
            nn.Linear(self.feature_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        # x: [B,60,8]
        out, _ = self.lstm(x)        # [B,60,2*hidden]
        last = out[:, -1, :]         # [B,2*hidden]
        features = self.proj_features(last)  # [B,128]

        fresh = self.head_freshness(features).squeeze(-1)   # [B]
        prob = self.head_spoilage(features).squeeze(-1)     # [B]

        fresh = torch.clamp(fresh, 0.0, 100.0)
        return fresh, prob, features
