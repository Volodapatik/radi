# Project TODO

- [x] Android 15-compatible Radio Folder Streamer home screen
- [x] Select one local music folder using the system folder picker
- [x] Scan supported audio files in the selected folder
- [x] Play files in deterministic filename order
- [x] Loop the folder continuously after the last track
- [ ] Support common audio formats and transcode to the Caster.fm-compatible stream profile
- [x] Caster.fm settings for host, port, username, mount point, and password
- [x] Securely persist the Caster.fm password on the device
- [x] Use Caster.fm maximum profile of MP3 at 96 kbps
- [x] Start/Stop broadcast control
- [ ] Foreground/background broadcast operation with screen locked
- [ ] Disable phone speaker output while broadcasting
- [ ] Automatic reconnect after network or server interruption
- [ ] Restore selected folder and settings after app restart
- [ ] Optional automatic restart after device reboot
- [ ] Support Wi-Fi and mobile data
- [x] Display current filename and playback progress
- [ ] Send current-track metadata when supported by Caster.fm
- [ ] Diagnostics screen for connection state and errors
- [x] Dark broadcast-console visual theme
- [ ] Generate custom app logo and update all required icon assets
- [ ] Add Android permissions and native configuration for foreground audio service
- [x] Add deterministic unit tests for folder ordering, looping, settings validation, and reconnect backoff
- [ ] Verify behavior on Android 15 / Helio G99-Ultra device
- [ ] Produce installable APK and setup instructions

## MVP scope change

- [x] First validation uses the user's folder with 18 MP3 files
- [x] Defer WAV, FLAC, M4A, and other format support until MP3-to-Caster.fm transmission is verified

## APK build issue

- [ ] Diagnose why APK cannot be built or downloaded from the latest checkpoint
- [ ] Fix the APK build or delivery blocker
- [ ] Re-run validation and save a corrected checkpoint

## Remote APK build stall

- [ ] Investigate remote Expo build stalled at 1% for more than six minutes
- [ ] Retry build after confirming the latest checkpoint and native configuration

## GitHub delivery

- [x] Audit tracked files for credentials, tokens, generated native directories, and unnecessary build artifacts
- [x] Add GitHub Actions workflow for Android APK build
- [x] Create private GitHub repository and push the project
- [x] Verify repository visibility and workflow instructions

## Preview crash

- [x] Fix Expo SecureStore web preview crash caused by unavailable native SecureStore methods

## Full ZIP delivery

- [x] Create a complete source ZIP suitable for GitHub Actions
- [x] Verify the ZIP excludes secrets, node_modules, .git, and generated local artifacts
- [x] Attach the ZIP and explain the GitHub Actions secret/setup steps

## Upload to Volodapatik/radi

- [ ] Push the complete Radio Folder Streamer source into the empty `Volodapatik/radi` repository
- [ ] Verify the GitHub Actions workflow is visible in the repository
- [ ] Provide the exact Termux commands to add EXPO_TOKEN and run the workflow
