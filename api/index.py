import sys
import os

# Add backend directory to path to allow absolute imports
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from backend.app import app
