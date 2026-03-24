import serial
import json
import requests
from collections import deque
import time
import argparse

API_URL = "http://localhost:8000/sensor/"
CONTAINER_ID = "container_1" 

def main(com_port):
    print(f"Starting Hardware Bridge on {com_port}...")
    try:
        ser = serial.Serial(com_port, 9600, timeout=1)  
        print("Connected to Arduino successfully.")
    except Exception as e:
        print(f"Error connecting to serial port {com_port}: {e}")
        print("Continuing without serial port. Warning: Script will block until valid JSON is mocked or hardware is attached.")
        ser = None
        # In a real environment, uncomment to return
        # return
        
    # Buffer to keep the latest 30 readings
    buffer = deque(maxlen=30)
    
    print("\nInitialization Complete. Listening for Arduino data...")
    print("When hardware is connected, data will flow to the backend API automatically.")
    
    while True:
        if ser and ser.in_waiting > 0:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                continue
                
            try:
                # Expecting the Arduino to send JSON string
                # E.g. {"NH3": 0.5, "H2S": 0.5, "CH4": 300.0, "VOC": 10.0, "temperature": 25.0, "humidity": 60.0}
                data = json.loads(line)
                
                # Map exact hardware readings to BiLSTM supported features. 
                # Unsupported gases (alcohol, H2) are given baseline defaults (0.0).
                features = {
                    "NH3": data.get("NH3", 0.0),             # From MQ135 / DFRobot NH3
                    "H2S": data.get("H2S", 0.0),             # From MQ136
                    "CH4": data.get("CH4", 0.0),             # From MQ4
                    "alcohol": data.get("alcohol", 0.0),     # Default
                    "VOC": data.get("VOC", 0.0),             # From MQ135
                    "H2": data.get("H2", 0.0),               # Default
                    "temperature": data.get("temperature", 25.0), # From DHT11
                    "humidity": data.get("humidity", 50.0)        # From DHT11
                }
                
                buffer.append(features)
                print(f"Read [{len(buffer)}/30]: CH4={features['CH4']} | NH3={features['NH3']} | H2S={features['H2S']} | Temp={features['temperature']}")
                
                # Only predict when we have accumulated a full 30-timestep rolling window
                if len(buffer) == 30:
                    payload = {
                        "container_id": CONTAINER_ID,
                        "readings": list(buffer)
                    }
                    
                    try:
                        res = requests.post(API_URL, json=payload, timeout=5)
                        response_data = res.json()
                        status = response_data.get('container_status', 'Unknown')
                        
                        print(f"-> Backend Response | Status: {response_data.get('status')} | Freshness: {response_data.get('freshness')} | Spoilage: {status}")
                        
                        # Signal Arduino via Serial for hardware feedback (LED/LCD/Buzzer)
                        if status == "Spoiled":
                            ser.write(b"ALERT:SPOILED\n")
                        elif status == "Warning":
                            ser.write(b"ALERT:WARNING\n")
                            
                    except requests.exceptions.Timeout:
                        print("Backend API Timeout. Is the FastAPI server running?")
                    except Exception as e:
                        print(f"Failed to post to backend API: {e}")
                        
            except json.JSONDecodeError:
                # Ignore malformed or truncated JSON lines 
                pass
            except Exception as e:
                print(f"Unexpected error parsing line: {e}")
                
        time.sleep(0.1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hardware Bridge for Smart Canteen AI")
    parser.add_argument("--port", type=str, default="COM3", help="USB Serial Port (e.g., COM3, /dev/ttyUSB0)")
    args = parser.parse_args()
    
    main(args.port)
