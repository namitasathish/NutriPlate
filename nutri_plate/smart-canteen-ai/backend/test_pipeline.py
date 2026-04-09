"""
test_pipeline.py — NutriPlate End-to-End Pipeline Test
=======================================================
Run this while the backend (main.py) is running to verify
the full sensor data pipeline works correctly.

Usage:
    cd backend
    .venv\Scripts\activate
    python test_pipeline.py
"""

import requests
import json
import time

BASE = "http://localhost:8000"

def sep(title=""):
    print("\n" + "=" * 50)
    if title:
        print(f"  {title}")
        print("=" * 50)

def ok(msg):  print(f"  [OK] {msg}")
def err(msg): print(f"  [ERR] {msg}")
def info(msg): print(f"  [..] {msg}")

# ── 1. Backend health ──
sep("Step 1: Verify Backend Is Running")
try:
    r = requests.get(f"{BASE}/sensor/live", timeout=3)
    ok(f"Backend is up – /sensor/live returned HTTP {r.status_code}")
    live = r.json()
    info(f"Initial state: connected={live.get('connected')}, "
         f"bridge_connected={live.get('bridge_connected')}, "
         f"warmup={live.get('warmup')}")
except Exception as e:
    err(f"Cannot reach backend: {e}")
    print("\n  Make sure you have run:  python main.py  in the backend folder.")
    exit(1)

# ── 2. Bridge ping ──
sep("Step 2: Send /sensor/ping (simulates bridge startup)")
try:
    r = requests.post(f"{BASE}/sensor/ping", timeout=3)
    ok(f"Ping accepted: {r.json()}")
except Exception as e:
    err(f"Ping failed: {e}")

# Verify state changed
r = requests.get(f"{BASE}/sensor/live", timeout=3).json()
info(f"After ping: bridge_connected={r.get('bridge_connected')}, warmup={r.get('warmup')}")

# ── 3. Single raw reading (simulates one Arduino JSON line) ──
sep("Step 3: POST /sensor/raw (simulates one Arduino reading)")

# Use the EXACT same spoiled values the user's Arduino is sending
# NH3=23.07, H2S=31.18 → both VERY high → should show Spoiled
spoiled_reading = {
    "NH3": 23.07,
    "H2S": 31.18,
    "CH4": 449.7,
    "alcohol": 1.37,
    "VOC": 0.0,
    "H2": 0.0,
    "temperature": 28.4,
    "humidity": 38.5,
}

try:
    r = requests.post(f"{BASE}/sensor/raw", json=spoiled_reading, timeout=3)
    if r.status_code == 200:
        data = r.json()
        ok(f"Accepted! Heuristic freshness = {data.get('heuristic_freshness')}%  "
           f"Status = {data.get('heuristic_status')}")
    else:
        err(f"HTTP {r.status_code}: {r.text}")
except Exception as e:
    err(f"POST /sensor/raw failed: {e}")

# ── 4. Check /sensor/live reflects the reading ──
sep("Step 4: Check /sensor/live is updated")
try:
    r = requests.get(f"{BASE}/sensor/live", timeout=3)
    live = r.json()
    connected      = live.get("connected")
    bridge         = live.get("bridge_connected")
    warmup         = live.get("warmup")
    latest         = live.get("latest_reading")
    container      = live.get("container")
    buffer_count   = live.get("buffer_count")

    if connected:
        ok(f"connected=True  bridge_connected={bridge}  warmup={warmup}")
    else:
        err(f"connected=False even after /sensor/raw — something is wrong")

    if latest:
        ok(f"Latest reading: NH3={latest.get('NH3')}, H2S={latest.get('H2S')}, "
           f"Temp={latest.get('temperature')}°C, Hum={latest.get('humidity')}%")
    else:
        err("latest_reading is None — /sensor/raw did not store the reading")

    if container:
        ok(f"Container: freshness={container.get('freshness_score')}%  "
           f"status={container.get('status')}")
    else:
        err("container is None — DB was not updated by /sensor/raw")

    info(f"Buffer count: {buffer_count}/30")

except Exception as e:
    err(f"GET /sensor/live failed: {e}")

# ── 5. Fill 30 readings and trigger BiLSTM ──
sep("Step 5: Send 30 readings → trigger BiLSTM inference")
info("Sending 30 spoiled readings (same as Arduino output)...")

for i in range(29):   # 1 already sent above
    r = requests.post(f"{BASE}/sensor/raw", json=spoiled_reading, timeout=3)
    if r.status_code != 200:
        err(f"Reading {i+2} failed: {r.status_code}")
        break
    if (i+2) % 10 == 0:
        info(f"  ... sent {i+2}/30")

# Now send batch to BiLSTM
batch_payload = {
    "container_id": "container_1",
    "readings": [spoiled_reading] * 30,
}
try:
    r = requests.post(f"{BASE}/sensor/", json=batch_payload, timeout=10)
    if r.status_code == 200:
        data = r.json()
        ok(f"BiLSTM inference: freshness={data.get('freshness'):.1f}%  "
           f"status={data.get('container_status')}")
    else:
        err(f"BiLSTM POST failed HTTP {r.status_code}: {r.text[:200]}")
except Exception as e:
    err(f"BiLSTM POST exception: {e}")

sep("Test Complete")
print("  If all steps above show [OK], the backend pipeline is working correctly.")
print("  The mobile app (with Demo Mode OFF) should now show live sensor data.")
print()
print("  If any step shows [ERR], fix that step first before debugging the frontend.")
print()
