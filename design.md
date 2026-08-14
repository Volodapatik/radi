# Radio Folder Streamer — Mobile Interface Design

## Product direction

Radio Folder Streamer is a focused Android utility for turning one local music folder into a continuous internet radio broadcast. The interface prioritizes a clear live/off-air state, one-tap control, and safe operation while the phone is charging with the screen locked. It does not use a microphone and does not expose unnecessary DJ controls.

The design assumes portrait orientation (9:16), one-handed use, Android 15, and a dark-first visual language appropriate for a radio control room.

## Screen list

### 1. Broadcast Home

The primary screen contains the station identity, a large live status card, the currently playing filename, the selected folder, connection health, and the main Start/Stop control. The status card uses an unmistakable green “ON AIR” state and a neutral “OFF AIR” state. A compact reconnect indicator reports whether the app is connected, reconnecting, or waiting for network.

The folder section shows the selected folder name and track count, with a single “Choose folder” action. The current-track section shows the filename and a small progress indicator. The bottom action is a large thumb-friendly button: “Start broadcast” when offline and “Stop broadcast” when live.

### 2. Folder Picker / Folder Confirmation

Android’s system folder picker is used to select a directory. After selection, the app shows the folder name, supported audio-file count, skipped-file count, and the playback order. The user confirms the folder before it becomes the active station source.

### 3. Settings

Settings contains Caster.fm connection fields: server host, port, username, mount point, and password. The password is stored locally using secure device storage and is never displayed in plain text after saving. The screen also contains bitrate/codec settings constrained by the server limit, auto-reconnect, launch-after-reboot, and a “disable phone speaker output” preference.

### 4. Diagnostics

Diagnostics shows the last connection attempt, current server endpoint without exposing the password, selected encoder profile, current track, reconnect count, and a readable error message. This screen helps the user troubleshoot Caster.fm “Offline” or “Off Air” states.

## Key user flows

### First-time setup

1. User opens the app.
2. User taps “Choose folder”.
3. Android folder picker opens.
4. User selects a folder containing audio files.
5. App scans the folder and displays the supported file count.
6. User opens Settings and enters Caster.fm connection values.
7. User taps “Start broadcast”.
8. App validates the local folder and server settings, starts the background audio service, and shows “ON AIR”.

### Continuous playback

1. App reads supported files from the selected folder in deterministic filename order.
2. It sends each file through the configured encoder at the Caster.fm maximum of 96 kbps.
3. At the end of the folder, playback loops to the first file.
4. The current filename is shown locally and sent as stream metadata when supported by the server.
5. If the network drops, the app enters “Reconnecting”, retries with backoff, and resumes the stream without requiring manual intervention.

### Restart recovery

1. Android starts the foreground service after reboot when the user has enabled auto-start and battery-exemption permissions.
2. The app restores the last selected folder and saved Caster.fm settings.
3. It resumes the broadcast only when a usable network is available.

## Color choices

The brand uses a dark broadcast-console palette:

| Token | Color | Purpose |
|---|---|---|
| Background | #0B0D10 | Main app background and night-time control-room feel |
| Surface | #151A20 | Cards and elevated settings sections |
| Primary cyan | #29D3FF | Main actions, active links, and audio signal accents |
| On-air green | #39D98A | Live broadcast and healthy connection state |
| Reconnecting amber | #F5B942 | Temporary network recovery state |
| Error red | #FF5C6C | Failed connection or invalid configuration |
| Primary text | #F3F6F8 | High-contrast headings and values |
| Muted text | #8D98A5 | Supporting labels and diagnostics |

The main Start/Stop button remains at the lower portion of the home screen, above the safe-area boundary, for one-handed reach. Destructive or irreversible actions are not used; stopping the broadcast is reversible and requires only a single deliberate tap.
