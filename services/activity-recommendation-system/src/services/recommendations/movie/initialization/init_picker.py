import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INIT_ML_DATASET_DIR = ROOT / "../../../datasets/movies/initialization"

class InitSetPicker:

    def __init__(self, path: Path = INIT_ML_DATASET_DIR / "baseline_init_sets.json"):
        self.path = path

    def load_sets(self):
        if not self.path.exists():
            raise FileNotFoundError(f"Init sets file not found: {self.path}")

        with open(self.path, "r") as f:
            return json.load(f)

    def pick_random(self):
        sets = self.load_sets()
        return random.choice(sets)

    def pick_by_index(self, idx: int):
        sets = self.load_sets()
        if idx < 0 or idx >= len(sets):
            raise IndexError("Init set index out of range")

        return sets[idx]