import os
import sys

# Ensure backend directory is in sys.path so that absolute imports (from db import ...) work
# even when imported as a package (import backend.main).
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
