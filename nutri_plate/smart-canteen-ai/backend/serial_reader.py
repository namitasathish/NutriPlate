"""
serial_reader.py — Integrated Arduino Serial Reader
====================================================
Runs as a background daemon thread inside the FastAPI backend.
Auto-detects the Arduino COM port, reads JSON sensor data,
and processes it directly (no HTTP round-trips needed).

This REPLACES the need to run hardware_bridge.py separately.
Just start main.py and it handles everything.
"""

import json
import threading
import time
from collections import deque

# ── Serial library (optional — backend still starts without it) ──
try:
    import serial
    import serial.tools.list_ports
    HAS_SERIAL = True
except ImportError:
    HAS_SERIAL = False
    print("[Serial Reader] pyserial not installed — serial reading disabled.")
    print("[Serial Reader] Install with:  pip install pyserial")

BAUD_RATE = 9600
RECONNECT_DELAY = 5     # seconds between reconnect attempts
LOOP_SLEEP = 0.05       # 50ms main loop sleep

# Common USB-Serial chip identifiers for auto-detection
ARDUINO_KEYWORDS = [
    'arduino', 'ch340', 'ch341', 'ftdi', 'usb serial', 'usb-serial',
    'cp210', 'silicon labs', 'wch', 'genuino', 'mega', 'uno', 'nano',
]


def find_arduino_port():
    """
    Auto-detect the Arduino's COM port by scanning USB-serial descriptors.
    Returns the port device string (e.g. 'COM3') or None.
    """
    if not HAS_SERIAL:
        return None

    ports = serial.tools.list_ports.comports()
    for p in ports:
        searchable = f"{p.description or ''} {p.manufacturer or ''} {p.hwid or ''}".lower()
        if any(kw in searchable for kw in ARDUINO_KEYWORDS):
            return p.device

    # Fallback: if there's exactly one serial port, it's probably the Arduino
    if len(ports) == 1:
        return ports[0].device

    return None


def _reader_loop():
    """
    Main background loop:
      1. Auto-detect Arduino COM port
      2. Open serial connection (without resetting the board)
      3. Read JSON lines from Arduino
      4. Process each reading via process_raw_reading()
      5. After 30 readings, trigger BiLSTM batch inference
      6. Send AI result back to Arduino for LED/buzzer feedback
      7. Auto-reconnect if connection is lost
    """
    # Lazy imports to avoid circular dependencies at module load time
    from routes.sensor_data import (
        process_raw_reading, process_sensor_batch,
        _live_state, LIVE_CONTAINER_ID
    )

    buffer = deque(maxlen=30)
    ser = None
    data_flowing = False

    print("[Serial Reader] Background thread started — scanning for Arduino...")

    while True:
        # ── CONNECT if needed ──
        if ser is None or not ser.is_open:
            data_flowing = False
            port = find_arduino_port()
            if port:
                try:
                    ser = serial.Serial(
                        port, BAUD_RATE, timeout=1,
                        dsrdtr=False,   # prevent DTR toggle → no Arduino reset
                        rtscts=False,
                    )
                    ser.reset_input_buffer()

                    # Signal backend that we're connected (warmup phase)
                    _live_state["bridge_connected"] = True
                    _live_state["last_ping_time"] = time.time()
                    if _live_state["latest_reading"] is None:
                        _live_state["warmup"] = True

                    print(f"[Serial Reader] ✓ Connected to {port} at {BAUD_RATE} baud")
                    print(f"[Serial Reader]   Waiting for JSON data (Arduino may be warming up)...")
                except serial.SerialException as e:
                    print(f"[Serial Reader] Could not open {port}: {e}")
                    print(f"[Serial Reader]   Is the Arduino IDE Serial Monitor still open? Close it!")
                    time.sleep(RECONNECT_DELAY)
                    continue
            else:
                # No port found — wait and retry
                time.sleep(RECONNECT_DELAY)
                continue

        # ── KEEPALIVE: update ping timestamp so frontend knows we're alive ──
        _live_state["last_ping_time"] = time.time()

        # ── READ serial data ──
        try:
            if ser.in_waiting > 0:
                raw = ser.readline()
                line = raw.decode('utf-8', errors='replace').strip()
                if not line:
                    time.sleep(LOOP_SLEEP)
                    continue

                # Try to parse as JSON
                try:
                    data = json.loads(line)

                    # First valid JSON — warmup is done
                    if not data_flowing:
                        data_flowing = True
                        print()
                        print("=" * 52)
                        print("  >>> WARMUP COMPLETE — Sensor data flowing!")
                        print("=" * 52)
                        print()

                    # Build reading dict
                    reading = {
                        "NH3":         float(data.get("NH3",         0.0)),
                        "H2S":         float(data.get("H2S",         0.0)),
                        "CH4":         float(data.get("CH4",         0.0)),
                        "alcohol":     float(data.get("alcohol",     0.0)),
                        "VOC":         float(data.get("VOC",         0.0)),
                        "H2":          float(data.get("H2",          0.0)),
                        "temperature": float(data.get("temperature", 25.0)),
                        "humidity":    float(data.get("humidity",     50.0)),
                    }

                    buffer.append(reading)

                    # ── Process the reading (updates live state + DB) ──
                    result = process_raw_reading(reading)

                    print(
                        f"[Serial {len(buffer):02d}/30]  "
                        f"Temp={reading['temperature']:.1f}°C  "
                        f"Hum={reading['humidity']:.0f}%  "
                        f"NH3={reading['NH3']:.2f}  "
                        f"H2S={reading['H2S']:.2f}  "
                        f"CH4={reading['CH4']:.0f}  "
                        f"Freshness={result['heuristic_freshness']}% ({result['heuristic_status']})"
                    )

                    # ── Batch inference once we have 30 readings ──
                    if len(buffer) == 30:
                        print("\n[AI]  Running BiLSTM inference on 30-reading window...")
                        batch_result = process_sensor_batch(LIVE_CONTAINER_ID, list(buffer))
                        buffer.clear()  # Reset — collect 30 fresh readings before next inference
                        if batch_result:
                            fr = batch_result.get("freshness", 0)
                            st = batch_result.get("container_status", "Unknown")
                            print(f"[AI]  ✓ Freshness: {fr:.1f}%  Status: {st}")

                            # Send result back to Arduino for LED/buzzer feedback
                            try:
                                feedback = f"RESULT:{int(round(fr))}:{st}\n"
                                ser.write(feedback.encode('utf-8'))
                                print(f"[->Arduino]  {feedback.strip()}")
                            except Exception:
                                pass
                        print()

                except json.JSONDecodeError:
                    # Non-JSON line (startup banner, separator, etc.)
                    if line:
                        print(f"[Serial] {line}")
                except Exception as e:
                    print(f"[Serial] Processing error: {e}")

        except serial.SerialException as e:
            print(f"\n[Serial Reader] Connection lost: {e}")
            print(f"[Serial Reader] Will auto-reconnect in {RECONNECT_DELAY}s...")
            ser = None
            _live_state["bridge_connected"] = False
            _live_state["connected"] = False
            _live_state["warmup"] = False
            time.sleep(RECONNECT_DELAY)
            continue
        except Exception as e:
            print(f"[Serial Reader] Unexpected error: {e}")

        time.sleep(LOOP_SLEEP)


def start_serial_reader():
    """
    Start the Arduino serial reader as a daemon background thread.
    Call this from main.py on startup.
    Returns the thread object (or None if pyserial is not available).
    """
    if not HAS_SERIAL:
        print("[Serial Reader] Skipped — pyserial not installed.")
        return None

    thread = threading.Thread(
        target=_reader_loop,
        daemon=True,
        name="ArduinoSerialReader"
    )
    thread.start()
    print("[Serial Reader] ✓ Background thread started (daemon)")
    return thread
