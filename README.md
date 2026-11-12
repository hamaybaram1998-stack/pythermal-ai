# PyThermal AI

Android visible-light **thermal color simulation** using a Python localhost server and JavaScript camera interface. **Not a thermometer**: no temperature measurements or fever detection are possible with an ordinary camera.

## Termux

```sh
pkg update
pkg install python git
git clone https://github.com/hamaybaram1998-stack/pythermal-ai.git
cd pythermal-ai
python server.py
```

Open http://localhost:8765 in Chrome and grant camera access. Keep Termux running. Use Chrome Add to Home screen for an app-like shortcut; this is not an APK.

Features: live front/back camera, simulated palettes, brightness/contrast controls, PNG snapshots, offline local operation. No cloud uploads.

Camera troubleshooting: allow camera permission, use localhost not a LAN IP, close other camera apps, try Flip. Port conflict: `python server.py --port 8766`.

MIT licensed.
