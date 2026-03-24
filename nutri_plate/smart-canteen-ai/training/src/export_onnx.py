import os
import torch
from model_vision import VisionSpoilageNet

CKPT_PATH = "models/vision_efficientnet.pt"
ONNX_PATH = "models/vision_efficientnet.onnx"

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = VisionSpoilageNet().to(device)
    state = torch.load(CKPT_PATH, map_location=device)
    model.load_state_dict(state)
    model.eval()

    dummy = torch.randn(1, 3, 224, 224, device=device)

    # wrapper so ONNX has two outputs
    class Wrapper(torch.nn.Module):
        def __init__(self, net):
            super().__init__()
            self.net = net
        def forward(self, x):
            prob, feats = self.net(x)
            return prob, feats

    wrapper = Wrapper(model)

    torch.onnx.export(
        wrapper, dummy, ONNX_PATH,
        input_names=["image"],
        output_names=["spoilage_prob", "vision_features"],
        dynamic_axes={"image": {0: "batch"}, "spoilage_prob": {0: "batch"}, "vision_features": {0: "batch"}},
        opset_version=17
    )
    print("Exported to", ONNX_PATH)

if __name__ == "__main__":
    os.makedirs("models", exist_ok=True)
    main()
