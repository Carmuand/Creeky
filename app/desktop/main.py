"""
Application entry point.
"""

# Standard library
from __future__ import annotations
import sys
from pathlib import Path

APP_ROOT: Path = Path(__file__).resolve().parent.parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

# Project imports
from desktop.bootstrap import bootstrap


if __name__ == "__main__":
    bootstrap()