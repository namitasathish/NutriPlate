import sqlite3
import time
import hashlib
import os
from typing import Dict, Any, Optional, List

DB_PATH = os.path.join(os.path.dirname(__file__), "canteen.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

# ────────────────────────────────────────────
# Schema Initialization
# ────────────────────────────────────────────
def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT UNIQUE NOT NULL,
            password    TEXT NOT NULL,
            role        TEXT NOT NULL CHECK(role IN ('student','staff')),
            created_at  REAL DEFAULT (strftime('%s','now'))
        );

        CREATE TABLE IF NOT EXISTS containers (
            id              TEXT PRIMARY KEY,
            food_name       TEXT DEFAULT 'Unknown',
            vision_features TEXT DEFAULT '[]',
            sensor_readings TEXT DEFAULT '[]',
            freshness_score REAL DEFAULT 100.0,
            status          TEXT DEFAULT 'Fresh',
            sensor_score    REAL DEFAULT 0.0,
            vision_spoilage REAL DEFAULT 0.0,
            timestamp       REAL DEFAULT (strftime('%s','now'))
        );

        CREATE TABLE IF NOT EXISTS health_goals (
            user_id         INTEGER PRIMARY KEY REFERENCES users(id),
            calories        REAL DEFAULT 2000,
            protein         REAL DEFAULT 60,
            carbohydrates   REAL DEFAULT 250,
            fat             REAL DEFAULT 65
        );
    """)
    # Seed two demo containers if table is empty
    count = c.execute("SELECT COUNT(*) FROM containers").fetchone()[0]
    if count == 0:
        now = time.time()
        c.execute(
            "INSERT INTO containers (id, food_name, freshness_score, status, timestamp) VALUES (?,?,?,?,?)",
            ("container_1", "Demo Curry", 100.0, "Fresh", now)
        )
        c.execute(
            "INSERT INTO containers (id, food_name, freshness_score, status, timestamp) VALUES (?,?,?,?,?)",
            ("container_2", "Demo Rice", 95.0, "Fresh", now)
        )
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")

# ────────────────────────────────────────────
# User / Auth helpers
# ────────────────────────────────────────────
def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(username: str, password: str, role: str) -> Optional[Dict]:
    conn = get_conn()
    try:
        c = conn.cursor()
        c.execute(
            "INSERT INTO users (username, password, role) VALUES (?,?,?)",
            (username, _hash_password(password), role)
        )
        conn.commit()
        user_id = c.lastrowid
        # Create default health goals for students
        if role == "student":
            c.execute("INSERT INTO health_goals (user_id) VALUES (?)", (user_id,))
            conn.commit()
        return {"id": user_id, "username": username, "role": role}
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def authenticate_user(username: str, password: str) -> Optional[Dict]:
    conn = get_conn()
    row = conn.execute(
        "SELECT id, username, role FROM users WHERE username=? AND password=?",
        (username, _hash_password(password))
    ).fetchone()
    conn.close()
    if row:
        return {"id": row["id"], "username": row["username"], "role": row["role"]}
    return None

def get_user(user_id: int) -> Optional[Dict]:
    conn = get_conn()
    row = conn.execute("SELECT id, username, role FROM users WHERE id=?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

# ────────────────────────────────────────────
# Container helpers
# ────────────────────────────────────────────
import json

def _row_to_container(row) -> Dict[str, Any]:
    d = dict(row)
    d["vision_features"] = json.loads(d.get("vision_features", "[]"))
    d["sensor_readings"] = json.loads(d.get("sensor_readings", "[]"))
    return d

def get_container(container_id: str) -> Dict[str, Any]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM containers WHERE id=?", (container_id,)).fetchone()
    if row is None:
        now = time.time()
        conn.execute(
            "INSERT INTO containers (id, timestamp) VALUES (?,?)",
            (container_id, now)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM containers WHERE id=?", (container_id,)).fetchone()
    conn.close()
    return _row_to_container(row)

def update_container(container_id: str, data: Dict[str, Any]):
    # Ensure container exists first
    _ = get_container(container_id)
    conn = get_conn()
    # Serialize list/dict fields
    if "vision_features" in data:
        data["vision_features"] = json.dumps(data["vision_features"])
    if "sensor_readings" in data:
        data["sensor_readings"] = json.dumps(data["sensor_readings"])
    data["timestamp"] = time.time()

    set_clause = ", ".join(f"{k}=?" for k in data.keys())
    values = list(data.values()) + [container_id]
    conn.execute(f"UPDATE containers SET {set_clause} WHERE id=?", values)
    conn.commit()
    conn.close()

def get_all_containers() -> List[Dict[str, Any]]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM containers ORDER BY timestamp DESC").fetchall()
    conn.close()
    return [_row_to_container(r) for r in rows]

# ────────────────────────────────────────────
# Health Goals helpers
# ────────────────────────────────────────────
def get_health_goals(user_id: int) -> Dict:
    conn = get_conn()
    row = conn.execute("SELECT * FROM health_goals WHERE user_id=?", (user_id,)).fetchone()
    conn.close()
    if row:
        return {"calories": row["calories"], "protein": row["protein"],
                "carbohydrates": row["carbohydrates"], "fat": row["fat"]}
    return {"calories": 2000, "protein": 60, "carbohydrates": 250, "fat": 65}

def set_health_goals(user_id: int, goals: Dict):
    conn = get_conn()
    conn.execute("""
        INSERT INTO health_goals (user_id, calories, protein, carbohydrates, fat)
        VALUES (?,?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET
            calories=excluded.calories,
            protein=excluded.protein,
            carbohydrates=excluded.carbohydrates,
            fat=excluded.fat
    """, (user_id, goals.get("calories", 2000), goals.get("protein", 60),
          goals.get("carbohydrates", 250), goals.get("fat", 65)))
    conn.commit()
    conn.close()
