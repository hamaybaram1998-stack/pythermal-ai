# PyThermal AI v5.0 — Smart Night Vision + AI Object Detection

A local Python HTTP server provides a browser camera app on Android/Termux.

## Features
- English default UI, with Kurdish Sorani and Arabic selection saved locally
- Redesigned mobile-first dark UI and installation prompt
- Installable PWA shell, versioned offline cache and manifest icons

- **Optional face detection and decorative thermal-style face overlay**, using browser FaceDetector if supported or BlazeFace downloaded on demand. Overlay colors are NOT real heat readings and may not work in very dark scenes.
- **Manual thermometer log**: user enters a real °C reading; timestamped entries stored only in this browser's localStorage, with clear-history control. No camera-based °C values are invented.

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
Open http://localhost:8765/?v=50 in Chrome and grant camera access. Tap Start Camera; optionally Enable AI (internet).

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

## Languages
Switch between Kurdish Sorani, Arabic, and English in the app. The language selection is remembered locally when browser storage is available. These translations cover primary controls and the safety warning; some live status messages remain English.

## Real thermal hardware
Actual heat detection in complete darkness requires a separate IR thermal sensor and a compatible native/USB interface. This web app does not yet read USB thermal sensors, and does not claim to. The existing 'Thermal simulation' mode only recolors visible-light camera frames.

## v5.0 privacy and safety
The camera video is processed locally in the browser. Optional face detection may download external model libraries. Temperature entries are stored in localStorage on the device, not transmitted to this Python server. Clearing browser site data also removes saved entries. The manual entry range (30–45°C) is a form validation range, not medical interpretation. The app is not a medical device, does not measure temperature, and must not be used to assess fever or make clinical decisions.

## Public distribution / install
This is an **installable web app (PWA), not a downloadable Android APK**. Download the source with GitHub's **Code → Download ZIP**, or clone the repository and run the Python server. For public no-Termux installation, deploy to GitHub Pages using the included `.github/workflows/pages.yml`. In GitHub repository Settings → Pages → Build and deployment → Source, select **GitHub Actions**. The workflow builds the 192/512 PNG icons and deploys the static app. Once the Pages deployment is successful, open the HTTPS Pages URL in Chrome → menu → Install app / Add to Home screen. Camera permission is required. The core app shell can work offline after installation; optional AI models require internet on first use. No APK or Google Play listing has been produced.

## Performance and transparency
Video processing is local. Optional TensorFlow.js AI can stall slower phones and depends on third-party CDN downloads. Face heat colors are decorative, never real heat. °C readings come only from manually entered thermometer measurements. Not a medical device.
