# PyThermal AI — Android test APK

This folder is a minimal Android WebView wrapper for the publicly hosted HTTPS PWA at:
https://hamaybaram1998-stack.github.io/pythermal-ai/

## Build with GitHub Actions
1. Open the **Actions** tab in this repository.
2. Choose **Build Android APK**.
3. Use **Run workflow** if no run has started automatically.
4. Wait for the job to complete successfully.
5. Open the run and download the **PyThermal-AI-v5-Android-debug** artifact ZIP.
6. Extract the APK and install on Android after reviewing Android's security warning for sideloading.

The debug APK is a test build signed with a temporary development key, **not** a verified production release or Play Store app. It has not been device-tested. Each build may use a different debug signing key, so uninstalling an older test build may be necessary before installing another.

## Requirements and privacy
- Android 8.0+ and Android System WebView
- Internet to load the hosted app
- Camera permission for camera modes
- The app loads the hosted site and optional third-party AI model CDNs. It does not itself measure body heat or temperature.
- Camera access is granted only to the trusted GitHub Pages origin, not arbitrary websites.

## Production release
For a stable publicly distributed APK, create and safeguard a persistent Android signing keystore, build a signed release, verify permissions, test on real devices, then publish it under GitHub Releases. Do not commit signing keys or passwords.
