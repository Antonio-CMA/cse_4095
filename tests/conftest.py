import sys
from pathlib import Path

# Let the tests import game.py / server.py from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
