# src/models/sensor_export_onnx.py

import torch

from .sensor_model import BiLSTMSensorModel
from .sensor_config import BEST_MODEL_PATH, ONNX_PATH


def export_sensor_onnx():
    device = torch.device("cpu")
    model = BiLSTMSensorModel().to(device)
    model.load_state_dict(torch.load(BEST_MODEL_PATH, map_location=device))
    model.eval()

    dummy_input = torch.randn(1, 60, 8, device=device)  # [batch,seq_len,channels]

    # Use opset 18 (what your PyTorch + onnxruntime stack prefers) and
    # keep shapes static to avoid the dynamic_axes warning.
    torch.onnx.export(
        model,
        dummy_input,
        ONNX_PATH,
        opset_version=18,          # <- use 18, no conversion
        input_names=["input"],
        output_names=["freshness_trend", "spoilage_prob", "sensor_features"],
        do_constant_folding=False, # <- avoid the optimizer pass that crashed
    )

    print(f"Exported BiLSTM sensor model to {ONNX_PATH}")


if __name__ == "__main__":
    export_sensor_onnx()
