# src/models/sensor_build_windows.py

import numpy as np
import h5py
import pickle
from sklearn.preprocessing import MinMaxScaler

from .sensor_config import (
    SEQ_LEN,
    STRIDE,
    TRAIN_SPLIT,
    TIME_SCALE,
    K_DECAY,
    GAS_SCALE_A,
    GAS_THRESHOLD_B,
    H5_TRAIN,
    H5_VAL,
    LABELS_TRAIN,
    LABELS_VAL,
    SCALER_PATH,
)
from .sensor_parse_raw import load_raw_files


def compute_freshness(time_sec: float) -> float:
    T = time_sec / TIME_SCALE
    freshness = 100.0 * np.exp(-K_DECAY * T)
    return float(np.clip(freshness, 0.0, 100.0))


def compute_gas_index(sensor_block: np.ndarray) -> float:
    # sensor_block: [seq_len, n_sensors]
    return float(np.mean(np.abs(sensor_block)))


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + np.exp(-x))


def map_16_to_8(sensor_row: np.ndarray, time_sec: float) -> np.ndarray:
    """
    sensor_row: shape (n_sensors,)
    If fewer than 11 channels, pad with zeros; if more, use first 11.
    """
    if sensor_row.shape[0] < 11:
        pad = np.zeros(11 - sensor_row.shape[0], dtype=np.float32)
        s = np.concatenate([sensor_row, pad], axis=0)
    else:
        s = sensor_row[:11]

    s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11 = s

    nh3_like = (s1 + s2) / 2.0
    h2s_like = s3
    ch4_like = s4
    alcohol_like = (s5 + s6) / 2.0
    voc_like = (s7 + s8 + s9 + s10) / 4.0
    h2_like = s11

    temp_c = 25.0 + 10.0 * (time_sec / (12 * 3600.0))
    rh = 70.0 + 10.0 * np.sin(2 * np.pi * time_sec / (3 * 3600.0))

    return np.array(
        [nh3_like, h2s_like, ch4_like, alcohol_like, voc_like, h2_like, temp_c, rh],
        dtype=np.float32,
    )


def build_sequences():
    dfs = load_raw_files()
    sequences = []
    labels = []

    for df in dfs:
        times = df["time_sec"].values
        sensor_cols = [c for c in df.columns if c.startswith("s")]
        sensors = df[sensor_cols].values  # [T, n_sensors]
        n_sensors = sensors.shape[1]
        print(f"Processing data with {n_sensors} sensor channels")

        # downsample: original ~100 Hz → take every 100th sample ≈ 1 s
        ds_factor = 100
        times = times[::ds_factor]
        sensors = sensors[::ds_factor]

        T_total = len(times)
        for start in range(0, T_total - SEQ_LEN + 1, STRIDE):
            end = start + SEQ_LEN
            window_times = times[start:end]
            window_sensors = sensors[start:end, :]

            mapped = np.stack(
                [map_16_to_8(window_sensors[i], window_times[i]) for i in range(SEQ_LEN)],
                axis=0,
            )  # [60,8]

            last_time = window_times[-1]
            freshness = compute_freshness(last_time)
            gas_idx = compute_gas_index(window_sensors)
            spoilage_prob = sigmoid(GAS_SCALE_A * (gas_idx - GAS_THRESHOLD_B))

            sequences.append(mapped)
            labels.append([freshness, spoilage_prob])

    sequences = np.stack(sequences, axis=0)      # [N,60,8]
    labels = np.array(labels, dtype=np.float32)  # [N,2]

    # scale all 8 channels
    N, L, C = sequences.shape
    flat = sequences.reshape(-1, C)
    scaler = MinMaxScaler()
    flat_scaled = scaler.fit_transform(flat)
    sequences_scaled = flat_scaled.reshape(N, L, C)

    # temperature compensation on NH3 (idx 0) using Temp (idx 6, scaled)
    nh3 = sequences_scaled[:, :, 0]
    temp = sequences_scaled[:, :, 6]
    nh3_adj = nh3 * np.exp(-0.05 * (temp * 10.0 - 25.0))  # heuristic
    sequences_scaled[:, :, 0] = nh3_adj

    # train/val split
    idx = np.arange(N)
    np.random.shuffle(idx)
    split = int(TRAIN_SPLIT * N)
    train_idx, val_idx = idx[:split], idx[split:]

    X_train = sequences_scaled[train_idx]
    y_train = labels[train_idx]
    X_val = sequences_scaled[val_idx]
    y_val = labels[val_idx]

    # save HDF5 + labels
    with h5py.File(H5_TRAIN, "w") as f:
        f.create_dataset("X", data=X_train)
    with h5py.File(H5_VAL, "w") as f:
        f.create_dataset("X", data=X_val)

    np.save(LABELS_TRAIN, y_train)
    np.save(LABELS_VAL, y_val)

    # save scaler
    with open(SCALER_PATH, "wb") as f:
        pickle.dump(scaler, f)

    print("Preprocessing done.")
    print("Train X:", X_train.shape, "y:", y_train.shape)
    print("Val   X:", X_val.shape, "y:", y_val.shape)


if __name__ == "__main__":
    np.random.seed(42)
    build_sequences()
