import sys
import cv2
import numpy as np
import onnxruntime as ort
import albumentations as A
from albumentations.pytorch import ToTensorV2
from dataset_vision import IMAGENET_MEAN, IMAGENET_STD

ONNX_PATH = "models/vision_efficientnet.onnx"

def get_infer_transform():
    return A.Compose([
        A.Resize(256, 256),
        A.CenterCrop(224, 224),
        A.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ToTensorV2()
    ])

def main(img_path: str):
    sess = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])
    transform = get_infer_transform()

    img = cv2.imread(img_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_t = transform(image=img)["image"].unsqueeze(0).numpy()  # [1,3,224,224]

    inputs = {"image": img_t}
    prob, feats = sess.run(None, inputs)
    spoilage_prob = float(prob[0][0])
    vision_features = feats[0]

    print("Spoilage probability:", spoilage_prob)
    print("Vision features dim:", vision_features.shape[0])

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python infer_onnx.py path/to/image.jpg")
    else:
        main(sys.argv[1])
