# PyThermal AI v3.1 — Smart Night Vision + AI Object Detection

A local Python HTTP server provides a browser camera app on Android/Termux.

## Features
- Thermal **color simulation**, night-vision enhancement, edge view, brightness and noise controls
- Front/rear camera and PNG snapshot
- Light level and simple frame-to-frame pixel motion estimate
- **Performance fix:** 256px display processing, 224px AI inference, maximum ~12fps color processing and 2.2-second AI detection intervals
- **Optional COCO-SSD object detection** using TensorFlow.js, drawing bounding boxes and confidence scores. Enable AI explicitly; an internet connection is needed to download scripts and model. AI processing runs in the browser, but the external CDN/model hosting receives network requests. No video frames are intentionally uploaded by this app.

## Important limitations
This is **not** a thermometer, thermal camera, fever detector, or through-darkness sensor. Normal RGB cameras cannot measure real infrared heat. AI may miss objects, especially in low light. A compatible physical thermal sensor is required for actual heat imaging.

## Termux install
```bash
pkg update -y
pkg install python git -y
git clone https://github.com/hamaybaram1998-stack/pythermal-ai.git
cd pythermal-ai
python server.py
```
Open http://localhost:8765/?v=3 in Chrome and grant camera access. Tap Start Camera; optionally Enable AI (internet).

## Update existing
```bash
cd ~/pythermal-ai
git pull origin main
python server.py
```
Stop old server first (Ctrl+C). If you cloned to `~/pythermal-v2`, update there instead. If port busy: `python server.py --port 8767` and open that port in Chrome.

App shortcut via Add to Home screen; **not an APK**. MIT licensed. Device-level AI performance has not yet been verified.

## Performance note
AI inference still runs on the browser main thread and may briefly freeze weaker devices. For maximum responsiveness disable AI. This is a mitigation, not a guaranteed fix; full worker/native inference would be needed for robust isolation.
