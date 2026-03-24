# Smart Canteen AI

## Overview
This project integrates Food Recognition, Spoilage Detection (Vision + Sensors), and Nutrition Estimation into a unified system.

## Directory Structure
- `backend/`: FastAPI server handling ML inference and state management.
- `mobile-app/`: React Native Expo app for Students and Staff.
- `scripts/`: Utility scripts (e.g., sensor simulation).

## How to Run
cd smart-canteen-ai
### 1. Backend
1. Navigate to `backend/`:
   ```bash
   cd backend
   .venv/Scripts/activate
   .venv\Scripts\activate

   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *Note: Ensure you have `tensorflow`, `onnxruntime`, `fastapi`, `uvicorn`, `pillow`, `requests` installed.*
3. Run the server:
   ```bash
   python main.py
   ```
   The API will start at `http://0.0.0.0:8000`.

### 2. Sensor Simulation (Demo Mode)
1. Open a new terminal.
2. Run the simulator:
   ```bash
   python scripts/simulate_sensors.py
   ```
   This will start sending data for `container_1` (fresh) and `container_2` (spoiling) to the backend.

### 3. Mobile App
1. Navigate to `mobile-app/`:
   ```bash
   cd mobile-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Expo:
   ```bash
   npx expo start
   ```
4. Connect via Expo Go app or Emulator.
   *Important: Update `services/api.js` with your computer's local IP address if testing on a physical device.*

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
