#!/data/data/com.termux/files/usr/bin/bash
set -e
pkg update
pkg install -y python git
python server.py
