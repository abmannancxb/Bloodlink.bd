# Mobile Deployment Instructions (Android)

I have prepared your project for Android using **Capacitor**. You can now build your `.aab` (Android App Bundle) or `.apk` file.

## 1. Prerequisites
- Install [Android Studio](https://developer.android.com/studio) on your computer.
- Ensure you have the Android SDK installed.

## 2. Download the Code
Use the **Settings** menu in AI Studio (bottom left) and select **Export to ZIP** or **Export to GitHub**.

## 3. How to Build (Locally)
1. Unzip the project and open the folder in your terminal.
2. Ensure you have Node.js installed, then run:
   ```bash
   npm install
   npm run build
   npx cap sync android
   ```
3. Open the `android` folder in **Android Studio**.
4. Go to **Build > Build Bundle(s) / APK(s) > Build Bundle(s)** to generate your `.aab` file.
   - The file will be located at: `android/app/build/outputs/bundle/debug/app-debug.aab` (for debug) or a similar path for release.

## 4. Features Included
- Native Splash Screen support (configured via Capacitor).
- Full access to Geolocation and Camera (permissions already added to `AndroidManifest.xml`).
- Persistent web view for real-time updates.

*Note: For the Play Store, you will need to sign the bundle in Android Studio using a Keystore.*
