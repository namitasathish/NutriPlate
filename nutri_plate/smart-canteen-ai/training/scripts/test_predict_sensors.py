import json
import requests

BASE_URL = "http://127.0.0.1:8000"

def main():
    payload = {
        "readings": [
            { "NH3": 20, "H2S": 10, "CH4": 50, "alcohol": 30, "VOC": 40, "H2": 10, "temperature": 30, "humidity": 70 },
            { "NH3": 40, "H2S": 20, "CH4": 50, "alcohol": 30, "VOC": 40, "H2": 10, "temperature": 30, "humidity": 70 }
        ]
    }
    resp = requests.post(f"{BASE_URL}/predict-sensors", json=payload)
    print("Status:", resp.status_code)
    print(json.dumps(resp.json(), indent=2))

if __name__ == "__main__":
    main()
