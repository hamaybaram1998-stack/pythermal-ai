# Install PyThermal AI v5.0

## Install as a phone app (PWA)
1. The repository owner must enable **Settings → Pages → Source: GitHub Actions**.
2. Wait for the **Deploy PyThermal AI PWA** workflow to succeed.
3. Open the published HTTPS GitHub Pages URL in Chrome on Android.
4. Tap Chrome menu → **Install app** or **Add to Home screen**.
5. Allow camera access when prompted.

**Important:** This is a Progressive Web App, not an APK. GitHub Pages must be enabled before the public app link works.

## Download and run locally (Termux)
```sh
pkg install git python -y
git clone https://github.com/hamaybaram1998-stack/pythermal-ai.git
cd pythermal-ai
python generate-icons.py
python server.py --port 8767
```
Open http://localhost:8767/?v=50 in Chrome. If you already cloned the repository, run `git pull origin main` instead of cloning again.

## Download source ZIP
Visit https://github.com/hamaybaram1998-stack/pythermal-ai and select **Code → Download ZIP**. The ZIP contains source code, not a prebuilt Android APK.

## Safety
Thermal palettes and face colors are visual simulations. The app does not measure body temperature. Manual temperature entries must come from a thermometer. Optional AI uses downloadable models and may be slow on older devices.
