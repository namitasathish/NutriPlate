# src/models/fusion_export_onnx.py

import torch
from pathlib import Path

from .fusion_model import FusionMLP
from .fusion_config import FUSION_BEST  # don't use FUSION_ONNX here


def export_fusion_onnx():
    device = torch.device("cpu")

    model = FusionMLP().to(device)
    state = torch.load(FUSION_BEST, map_location=device)
    model.load_state_dict(state)
    model.eval()

    dummy_input = torch.randn(1, 640, device=device)

    # Export into project root as fusion_mlp.onnx
    onnx_path = Path("fusion_mlp.onnx")

    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        opset_version=18,
        input_names=["fusion_input"],
        output_names=["final_freshness", "spoilt_prob", "confidence"],
        dynamic_axes=None,
        do_constant_folding=False,
        export_params=True,
    )

    print(f"Exported fusion model to {onnx_path.resolve()}")


if __name__ == "__main__":
    export_fusion_onnx()
