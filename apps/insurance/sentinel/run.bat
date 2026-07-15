@echo off
REM Supero app launcher (Windows). Mirror of run.sh.
cd /d "%~dp0"
if not exist .venv ( python -m venv .venv )
call .venv\Scripts\activate.bat
python -m pip install -q -r requirements.txt
python -m supero.cli %*
