#!/usr/bin/env python3
"""Lattice — Run: python3 -m lattice [options]"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from setup import main
sys.exit(main() or 0)
