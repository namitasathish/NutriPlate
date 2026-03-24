# scripts/test_fusion_predict.py

import base64
import json
from pathlib import Path
import requests

BASE_URL = "http://127.0.0.1:8000"


def main():
    # image
    img_dir = Path("data/dataset/spoiled_vegetables")  # folder with images
    print("Image dir exists?", img_dir.exists())
    first_img = next(img_dir.glob("*.*"))
    print("Using image:", first_img)

    b64 = base64.b64encode(first_img.read_bytes()).decode("utf-8")

    # sensors – simple short sequence; backend can handle padding/extension
    readings = [
        {
            "NH3": 20,
            "H2S": 10,
            "CH4": 50,
            "alcohol": 30,
            "VOC": 40,
            "H2": 10,
            "temperature": 30,
            "humidity": 70,
        },
        {
            "NH3": 60,
            "H2S": 30,
            "CH4": 50,
            "alcohol": 30,
            "VOC": 40,
            "H2": 10,
            "temperature": 30,
            "humidity": 70,
        },
    ]

    payload = {"image_base64": b64, "readings": readings}
    resp = requests.post(f"{BASE_URL}/fusion-predict", json=payload)
    print("Status:", resp.status_code)
    print(json.dumps(resp.json(), indent=2))


if __name__ == "__main__":
    main()
