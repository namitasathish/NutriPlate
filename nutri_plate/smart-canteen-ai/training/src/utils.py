import torch
import numpy as np
from sklearn.metrics import f1_score

def compute_f1(y_true, y_prob, threshold=0.5):
    # Convert inputs to numpy arrays if they're not already
    y_true = np.array(y_true)
    y_prob = np.array(y_prob)
    y_pred = (y_prob >= threshold).astype("int32")
    return f1_score(y_true, y_pred)

def save_checkpoint(model, path: str):
    torch.save(model.state_dict(), path)
