# src/models/sensor_parse_raw.py

import pandas as pd
from typing import List
from .sensor_config import RAW_CO, RAW_METHANE


def load_raw_files() -> List[pd.DataFrame]:
    dfs = []

    for path in [RAW_CO, RAW_METHANE]:
        # Your file has a header row, comma‑separated, then numeric data.
        df = pd.read_csv(
            path,
            sep=r"\s+",
            comment="#",
            header=0,
        )
        # Check how many columns there actually are
        n_cols = df.shape[1]
        print(f"{path} loaded with {n_cols} columns")

        # First 3: time + 2 gas concentrations, remaining = sensor channels
        assert n_cols >= 4, f"{path} must have at least 4 columns"
        n_sensors = n_cols - 3

        cols = ["time_sec", "gas1_ppm", "ethylene_ppm"] + [
            f"s{i}" for i in range(1, n_sensors + 1)
        ]
        df.columns = cols

        # normalize time to start at 0
        df["time_sec"] = df["time_sec"] - df["time_sec"].iloc[0]
        dfs.append(df)

    return dfs
