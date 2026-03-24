import requests
import time
import random

API_URL = "http://localhost:8000"

def generate_reading(trend='fresh'):
    # Baselines
    if trend == 'fresh':
        base_nh3 = 0.5
        base_h2s = 0.5
    elif trend == 'spoiling':
        base_nh3 = 5.0
        base_h2s = 2.0
    else: # spoiled
        base_nh3 = 15.0
        base_h2s = 10.0
        
    return {
        "NH3": base_nh3 + random.uniform(0, 1),
        "H2S": base_h2s + random.uniform(0, 1),
        "CH4": 0.5 + random.uniform(0, 0.1),
        "alcohol": 0.1 + random.uniform(0, 0.1),
        "VOC": 10.0 + random.uniform(0, 5),
        "H2": 0.0,
        "temperature": 25.0 + random.uniform(-1, 1),
        "humidity": 60.0 + random.uniform(-5, 5)
    }

def main():
    print("Starting Sensor Simulator...")
    
    # Create or update a few simulated containers
    # (container_1 is reserved for the real Arduino hardware via hardware_bridge.py)
    containers = ["container_2", "container_3"]
    trends = {"container_2": "spoiling", "container_3": "fresh"}
    
    while True:
        for cid in containers:
            reading = generate_reading(trends[cid])
            # Send a batch of 30 readings (simulating a window)
            window = [generate_reading(trends[cid]) for _ in range(30)]
            
            payload = {
                "container_id": cid,
                "readings": window
            }
            
            try:
                # Try with trailing slash first (FastAPI default)
                url = f"{API_URL}/sensor/"
                res = requests.post(url, json=payload)
                
                # If 307 redirect, requests follows it. If 404, maybe path issue?
                if res.status_code == 404:
                     # Try without slash
                     url = f"{API_URL}/sensor"
                     res = requests.post(url, json=payload)

                if res.status_code >= 400:
                    print(f"Failed to send to {cid}: {res.status_code} - {res.text}")
                else:
                    print(f"Sent update for {cid}: {res.status_code} - Freshness: {res.json().get('freshness', 'N/A')}")
            except Exception as e:
                print(f"Connection Error to {url}: {e}")
        
        time.sleep(5)

if __name__ == "__main__":
    main()
