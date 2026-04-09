"""
hardware_bridge.py — NutriPlate Hardware Bridge
================================================
Reads JSON sensor data from Arduino via USB Serial and forwards it to
the FastAPI backend for BiLSTM inference and spoilage detection.

IMPORTANT — Before running this script:
  1. Close the Arduino IDE Serial Monitor completely.
     The Serial Monitor holds exclusive access to the COM port.
     If it is open, this bridge will connect but receive zero bytes.
  2. Make sure the backend (main.py) is already running.
  3. Run: python hardware_bridge.py --port COM3
"""

import serial
import serial.tools.list_ports
import json
import requests
from collections import deque
import time
import argparse
import sys

API_URL     = "http://localhost:8000/sensor/"
CONTAINER_ID = "container_1"
BAUD_RATE   = 9600

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def check_backend():
    """Verify the FastAPI backend is reachable before we start. Exit loudly if not."""
    try:
        r = requests.get("http://localhost:8000/sensor/live", timeout=3)
        if r.status_code == 200:
            print("[OK] Backend is reachable at http://localhost:8000")
            return True
        else:
            print(f"[WARN] Backend replied with HTTP {r.status_code}")
            return True  # still running, just unusual
    except Exception as e:
        print(f"\n[ERROR] Cannot reach backend: {e}")
        print("[ERROR] Make sure you have run:  python main.py  in the backend folder first.")
        print("[ERROR] Exiting.\n")
        sys.exit(1)

def ping_backend():
    """Tell the backend the bridge is alive (warmup keepalive)."""
    try:
        requests.post(f"{API_URL}ping", timeout=2)
    except Exception:
        pass  # Non-blocking, best-effort

def post_raw(features: dict) -> bool:
    """POST a single reading to /sensor/raw. Returns True on success."""
    try:
        r = requests.post(f"{API_URL}raw", json=features, timeout=3)
        if r.status_code == 200:
            return True
        print(f"   [WARN] /sensor/raw HTTP {r.status_code}: {r.text[:100]}")
        return False
    except Exception as e:
        print(f"   [ERROR] POST /sensor/raw failed: {e}")
        return False

def post_batch(buffer: list) -> dict | None:
    """POST a 30-reading window to /sensor/ for BiLSTM inference."""
    payload = {"container_id": CONTAINER_ID, "readings": list(buffer)}
    try:
        r = requests.post(API_URL, json=payload, timeout=8)
        return r.json()
    except requests.exceptions.Timeout:
        print("   [WARN] BiLSTM inference timed out (backend may be busy).")
    except Exception as e:
        print(f"   [ERROR] POST /sensor/ failed: {e}")
    return None

def open_serial(port: str):
    """Open serial port WITHOUT resetting the Arduino (dsrdtr/rtscts=False)."""
    try:
        ser = serial.Serial(
            port, BAUD_RATE, timeout=1,
            dsrdtr=False,   # prevent DTR line toggle → Arduino won't reset
            rtscts=False,   # prevent RTS line toggle → Arduino won't reset
        )
        ser.reset_input_buffer()   # clear any stale bytes in OS buffer
        print(f"[OK] Serial port {port} opened at {BAUD_RATE} baud (Arduino NOT reset).")
        return ser
    except serial.SerialException as e:
        print(f"[ERROR] Could not open {port}: {e}")
        print("        Is the Arduino IDE Serial Monitor still open? Close it first!")
        return None

# ──────────────────────────────────────────────
# Main bridge loop
# ──────────────────────────────────────────────

def main(com_port: str):
    print("=" * 52)
    print("  NutriPlate Hardware Bridge")
    print("=" * 52)
    print(f"  Port     : {com_port}")
    print(f"  API      : {API_URL}")
    print(f"  Container: {CONTAINER_ID}")
    print("=" * 52)
    print()
    print("!!! IMPORTANT: Close Arduino IDE Serial Monitor before this !!!")
    print()

    # 1. Verify backend is up
    check_backend()

    # 2. Open serial port
    ser = open_serial(com_port)
    if ser is None:
        print("\nTip: Available serial ports on this machine:")
        for p in serial.tools.list_ports.comports():
            print(f"  {p.device}  {p.description}")
        sys.exit(1)

    # 3. Immediately tell backend bridge is live (shows "Warming Up" on frontend)
    print("\n[...] Pinging backend — frontend will show 'Arduino Warming Up'...")
    ping_backend()
    print("[OK]  Backend notified. Waiting for Arduino warmup + JSON data.\n")

    buffer        = deque(maxlen=30)
    data_flowing  = False
    last_ping     = time.time()
    last_byte     = time.time()   # track when we last received ANY byte
    PING_INTERVAL = 5             # keepalive every 5 s during warmup (was 10s — too infrequent)
    STALE_TIMEOUT = 30            # if no bytes for 30 s, warn user

    while True:
        now = time.time()

        # ── Warmup keepalive ping ──
        if not data_flowing and (now - last_ping) >= PING_INTERVAL:
            last_ping = now
            ping_backend()
            elapsed_s = int(now - last_byte) if data_flowing else int(now - last_ping)
            print(f"   [Warmup] Bridge alive, waiting for Arduino JSON data...")

        # ── Stale connection warning ──
        if not data_flowing and (now - last_byte) > STALE_TIMEOUT:
            print()
            print("   *** WARNING: No bytes received in 30s ***")
            print("   Is the Arduino IDE Serial Monitor still open?")
            print("   Close it, then restart this script.")
            print()
            last_byte = now  # reset so we don't spam

        # ── Read from serial ──
        if ser and ser.in_waiting > 0:
            last_byte = now
            raw = ser.readline()
            line = raw.decode('utf-8', errors='replace').strip()
            if not line:
                continue

            # ── Try to parse as JSON ──
            try:
                data = json.loads(line)

                # Warmup done — first valid JSON received
                if not data_flowing:
                    data_flowing = True
                    print()
                    print("=" * 52)
                    print("  >>> WARMUP COMPLETE — Sensor data flowing!")
                    print("=" * 52)
                    print()

                features = {
                    "NH3":         float(data.get("NH3",         0.0)),
                    "H2S":         float(data.get("H2S",         0.0)),
                    "CH4":         float(data.get("CH4",         0.0)),
                    "alcohol":     float(data.get("alcohol",     0.0)),
                    "VOC":         float(data.get("VOC",         0.0)),
                    "H2":          float(data.get("H2",          0.0)),
                    "temperature": float(data.get("temperature", 25.0)),
                    "humidity":    float(data.get("humidity",    50.0)),
                }

                buffer.append(features)

                print(f"[{len(buffer):02d}/30]  "
                      f"Temp={features['temperature']:.1f}°C  "
                      f"Hum={features['humidity']:.0f}%  "
                      f"NH3={features['NH3']:.2f}  "
                      f"H2S={features['H2S']:.2f}  "
                      f"CH4={features['CH4']:.0f}  "
                      f"Alcohol={features['alcohol']:.3f}")

                # Forward to backend immediately for real-time display
                ok = post_raw(features)
                if ok:
                    print(f"       -> /sensor/raw  OK  (frontend will update)")
                else:
                    print(f"       -> /sensor/raw  FAILED — check backend terminal!")

                # Run BiLSTM inference once buffer is full
                if len(buffer) == 30:
                    print("\n[AI]  Running BiLSTM inference on 30-reading window...")
                    result = post_batch(buffer)
                    if result:
                        freshness = result.get("freshness", 0)
                        status    = result.get("container_status", "Unknown")
                        print(f"[AI]  Freshness: {freshness:.1f}%  Status: {status}")

                        # Send result back to Arduino LEDs/Buzzer
                        feedback = f"RESULT:{int(round(freshness))}:{status}\n"
                        ser.write(feedback.encode('utf-8'))
                        print(f"[->]  Sent to Arduino: {feedback.strip()}\n")

            except json.JSONDecodeError:
                # Non-JSON line (startup banner, separator, etc.) — just display it
                print(f"   [Arduino] {line}")
            except Exception as e:
                print(f"   [Bridge error] {e}  |  raw bytes: {raw!r}")

        time.sleep(0.05)  # 50 ms loop — fast enough to keep up with 3-s Arduino interval


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="NutriPlate Hardware Bridge — reads Arduino serial and feeds backend."
    )
    parser.add_argument(
        "--port", type=str, default="COM3",
        help="USB serial port the Arduino is on (e.g. COM3, COM5, /dev/ttyUSB0)"
    )
    args = parser.parse_args()
    main(args.port)
