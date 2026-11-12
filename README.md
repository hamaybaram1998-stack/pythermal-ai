# PyThermal AI v2.0 — Smart Night Vision
A mobile-friendly **visible-light camera processing app** powered by a local Python HTTP server and JavaScript Canvas.

## Features
- Live front/rear camera and PNG snapshots
- Thermal **color simulation**, green night-vision style, edge highlighting, normal mode
- Automatic low-light brightness boost and temporal noise smoothing
- Ambient image brightness indicator and pixel motion estimate
- Offline/local processing; no camera frames uploaded

**Important:** This app cannot measure temperature or heat, detect people in complete darkness, or see infrared thermal radiation using a normal RGB camera. AI cannot recover information the sensor never captured. No actual object/person AI model is included. For real thermal sensing use a compatible external thermal camera.

## Install on Android Termux
```sh
pkg update -y
pkg install python git -y
git clone https://github.com/hamaybaram1998-stack/pythermal-ai.git
cd pythermal-ai
python server.py
```
Open **http://localhost:8765** in Chrome, grant camera permission and press Start Camera. Chrome Add to Home screen creates a shortcut, **not an APK**.

## Update existing installation
```sh
cd ~/pythermal-ai
git pull
python server.py
```
Stop the previous server with Ctrl+C before restarting. If port 8765 is busy, use `python server.py --port 8766`. Allow Chrome camera permission and use localhost rather than a LAN address.

MIT license. Tested at source-level only; real Android camera/device testing is still required.
