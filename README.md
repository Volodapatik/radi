
## Android APK build via GitHub Actions

This repository includes a manual workflow at `.github/workflows/build-android-apk.yml`. Create an Expo access token in your Expo account, then add it to the private GitHub repository as an Actions secret named `EXPO_TOKEN`. Open the repository's **Actions** tab, select **Build Android APK**, and choose **Run workflow**. The workflow uses the `preview` EAS profile, which produces an installable Android APK through the EAS build service.

Do not commit Caster.fm passwords, Expo access tokens, or local `.env` files. Caster.fm credentials are entered inside the application and stored locally on the Android device.
