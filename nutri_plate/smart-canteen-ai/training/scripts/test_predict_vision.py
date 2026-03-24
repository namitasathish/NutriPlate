import base64
import json
from pathlib import Path

import requests

BASE_URL = "http://127.0.0.1:8000"

def main():
    img_path = Path("data/dataset/spoiled_vegetables")  # adjust to real folder
    first_img = next(img_path.glob("*.*"))  # jpg/png/whatever
    b64 = base64.b64encode(first_img.read_bytes()).decode("utf-8")

    payload = {"image_base64": b64}
    print("Sending payload keys:", payload.keys())
    resp = requests.post(f"{BASE_URL}/predict-vision", json=payload)
    print("Status:", resp.status_code)
    print(json.dumps(resp.json(), indent=2))

if __name__ == "__main__":
    main()
