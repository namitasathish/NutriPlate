# Smart Canteen AI

## Overview
This project integrates Food Recognition, Spoilage Detection (Vision + Sensors), and Nutrition Estimation into a unified system.

## Directory Structure
- `backend/`: FastAPI server handling ML inference and state management.
- `mobile-app/`: React Native Expo app for Students and Staff.
- `scripts/`: Utility scripts (e.g., sensor simulation).

## Two Ways to Run the System

The mobile application now includes a built-in toggle on the Login screen:
- **Demo Mode (ON)**: Uses rich mock data for quick demonstrations. No backend or hardware required.
- **Actual Mode (OFF)**: Connects to the FastAPI backend and physical Arduino hardware for live sensor readings.

### Method A: Actual Mode (Full Hardware Integration)
Run this when you are ready to demo the live physical sensors and AI integration.
cd C:\college\NutriPlate\nutri_plate\smart-canteen-ai
1. **Hardware Setup**:
   - Flash `arduino/nutriplate_sensor_node.ino` to your Arduino.
   - **Connect the Arduino to your PC via USB.**
   - Note the COM port (e.g., `COM3`).
2. **Backend Server**:
   ```bash
   cd backend
   .venv\Scripts\activate
   pip install -r requirements.txt
   python main.py
   ```
   *(The backend server will automatically detect the Arduino COM port, connect to it, and read live sensor data in the background.)*
   cd C:\college\NutriPlate\nutri_plate\smart-canteen-ai\mobile-app
3. **Mobile App**:
   - Open a *new* terminal.
   ```bash
   cd mobile-app
   npm install
   npx expo start
   ```
   - *Note*: Update `API_URL` in `services/api.js` to match your local IP address if running on a physical phone.
   - On the App's Login Screen, **turn OFF the "Demo Mode (Mock Data)" toggle** before signing in.

---

### Method B: Demo Mode (No Hardware Needed)
Run this when you just want to test the UI, UX flows, or the app without an Arduino.

1. **Start the Mobile App**:
   ```bash
   cd mobile-app
   npx expo start
   ```
2. **On the Login Screen**: Make sure the **"Demo Mode (Mock Data)" toggle is ON** before signing in.
3. *Optional (Backend Simulation)*: If you want the backend features (like computer vision) but don't have an Arduino, turn the toggle OFF, start the Backend Server (Method A, Step 2), and run the Python simulator instead of the hardware bridge:
   ```bash
   python scripts/simulate_sensors.py
   ```

## Features Implemented
- **Multimodal Fusion**: Combines Vision (EfficientNet) and Sensor (BiLSTM) features using an MLP Fusion model for reliable spoilage detection.
- **Auth & Role-Based UX**: Persistent SQLite-backed authentication for Students and Staff with distinct navigation flows and dashboards.
- **Nutrition Intelligence**: Maps recognized food categories to a comprehensive macro-nutrient database (`nutrition101.csv`) for precise caloric tracking.
- **Heuristic Recommendation Engine**: A custom weighting algorithm that scores menu items based on current student health targets, protein requirements, and low-fat preferences.
- **Real-Time Staff Alerts**: Automated notification system for container spoilage, sensor anomalies, and stale data timestamps (>2hr).
- **State Management**: In-memory database tracks container status.

## Notes
- The Food Recognition model (`model_trained_101class.hdf5`) is expected in `backend/models/`. If missing, the system uses a fallback (untrained InceptionV3) but the pipeline remains functional.
- The Vision model is used as a feature extractor (Spoilage Anomaly).
