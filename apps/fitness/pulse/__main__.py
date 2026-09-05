#!/usr/bin/env python3
"""Pulse — Run: python3 -m pulse [options]"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from setup import main
sys.exit(main() or 0)
