import { Directory, File } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireNativeModule } from "expo-modules-core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { isSupportedAudioName, sortTrackNames } from "@/lib/track-utils";

const SETTINGS_KEY = "radio-folder-settings";
const PASSWORD_KEY = "casterfm-password";
type Track = { name: string; uri: string };
type IcecastApi = {
  connect: (host: string, port: number, mountPoint: string, username: string, password: string) => Promise<boolean>;
  sendBase64: (base64: string) => Promise<number>;
  disconnect: () => Promise<boolean>;
  startBroadcast: (host: string, port: number, mountPoint: string, username: string, password: string, folderUri: string) => Promise<boolean>;
  stopBroadcast: () => Promise<boolean>;
  getBroadcastStatus: () => Promise<{ status: string; message: string }>;
};

const Icecast = Platform.OS === "android" ? requireNativeModule<IcecastApi>("Icecast") : null;

type StreamSettings = {
  host: string;
  port: string;
  username: string;
  mountPoint: string;
  folderUri: string;
  folderName: string;
  loop: boolean;
  autoReconnect: boolean;
  autoStart: boolean;
};

const defaultSettings: StreamSettings = {
  host: "morcast.caster.fm",
  port: "16855",
  username: "source",
  mountPoint: "/WLtAP",
  folderUri: "",
  folderName: "Папку ще не вибрано",
  loop: true,
  autoReconnect: true,
  autoStart: false,
};

export default function HomeScreen() {
  const colors = useColors();
  const [settings, setSettings] = useState(defaultSettings);
  const [password, setPassword] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isOnAir, setIsOnAir] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const streamActiveRef = useRef(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [lastError, setLastError] = useState("");

  useEffect(() => {
    void (async () => {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      const savedPassword = Platform.OS === "web" ? null : await SecureStore.getItemAsync(PASSWORD_KEY);
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
      if (savedPassword) {
        setPassword(savedPassword);
      }
    })();
  }, []);

  const currentTrack = tracks[currentTrackIndex]?.name ?? "Очікується вибір папки";
  const progressLabel = tracks.length > 0 ? `${currentTrackIndex + 1} / ${tracks.length}` : "0 треків";
  const statusLabel = isOnAir ? "ON AIR" : isConnecting ? "ПІДКЛЮЧЕННЯ" : "OFF AIR";
  const statusColor = isOnAir ? colors.success : isConnecting ? colors.warning : colors.muted;

  const saveSettings = async (next: StreamSettings = settings) => {
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    if (password && Platform.OS !== "web") {
      await SecureStore.setItemAsync(PASSWORD_KEY, password);
    }
  };

  useEffect(() => () => {
    streamActiveRef.current = false;
    void Icecast?.stopBroadcast();
  }, []);

  useEffect(() => {
    if (!Icecast || (!isConnecting && !isOnAir)) return;
    const timer = setInterval(() => {
      void Icecast.getBroadcastStatus().then((status) => {
        if (status.status === "ERROR") {
          streamActiveRef.current = false;
          setIsConnecting(false);
          setIsOnAir(false);
          setLastError(status.message || "Caster.fm зупинив трансляцію");
        } else if (status.status === "CONNECTED" || status.status === "TRACK") {
          setIsConnecting(false);
          setIsOnAir(true);
        }
      }).catch(() => undefined);
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnecting, isOnAir]);

  const streamTracks = async (startIndex: number) => {
    let index = startIndex;
    while (streamActiveRef.current && tracks.length > 0) {
      setCurrentTrackIndex(index);
      const file = new File(tracks[index].uri);
      const base64 = await file.base64();
      if (!streamActiveRef.current) break;
      await Icecast?.sendBase64(base64);
      index = (index + 1) % tracks.length;
    }
  };

  const chooseFolder = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Вибір папки", "Вибір локальної папки доступний у встановленому Android APK.");
      return;
    }
    try {
      const directory = await Directory.pickDirectoryAsync();
      const entries = directory.list();
      const audioFiles = entries
        .filter((entry): entry is File => entry instanceof File && isSupportedAudioName(entry.name))
        .sort((a, b) => sortTrackNames([a.name, b.name])[0] === a.name ? -1 : 1);
      const next = {
        ...settings,
        folderUri: directory.uri,
        folderName: directory.uri.split("/").filter(Boolean).pop() || "Вибрана папка",
      };
      setTracks(audioFiles.map((file) => ({ name: file.name, uri: file.uri })));
      setCurrentTrackIndex(0);
      await saveSettings(next);
      setLastError("");
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Не вдалося прочитати папку");
    }
  };

  const toggleBroadcast = async () => {
    setLastError("");
    if (isOnAir) {
      streamActiveRef.current = false;
      await Icecast?.stopBroadcast();
      setIsOnAir(false);
      return;
    }
    if (!settings.folderUri || tracks.length === 0) {
      setLastError("Спочатку вибери папку з MP3-файлами.");
      return;
    }
    if (!password) {
      setLastError("Відкрий налаштування та введи пароль Caster.fm.");
      setShowSettings(true);
      return;
    }
    if (!Icecast) {
      setLastError("Справжня трансляція доступна у встановленому Android APK.");
      return;
    }
    setIsConnecting(true);
    try {
      await Icecast.startBroadcast(settings.host, Number(settings.port), settings.mountPoint, settings.username, password, settings.folderUri);
      streamActiveRef.current = true;
      setIsConnecting(false);
      setIsOnAir(true);
    } catch (error) {
      setIsConnecting(false);
      setLastError(error instanceof Error ? error.message : "Caster.fm не прийняв підключення");
    }
  };

  const updateSetting = <K extends keyof StreamSettings>(key: K, value: StreamSettings[K]) => {
    const next = { ...settings, [key]: value };
    void saveSettings(next);
  };

  const connectionSummary = useMemo(
    () => `${settings.host}:${settings.port}${settings.mountPoint}`,
    [settings.host, settings.port, settings.mountPoint],
  );

  return (
    <ScreenContainer containerClassName="bg-background" className="px-5 pt-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>RADIO FOLDER STREAMER</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Моє радіо</Text>
          </View>
          <View style={[styles.liveDot, { backgroundColor: statusColor }]} />
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: isOnAir ? colors.success : colors.border }]}>
          <View style={styles.statusTopRow}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            <Text style={[styles.bitrate, { color: colors.muted }]}>MP3 · 96 kbps</Text>
          </View>
          <Text style={[styles.trackName, { color: colors.foreground }]} numberOfLines={2}>
            {currentTrack}
          </Text>
          <Text style={[styles.trackMeta, { color: colors.muted }]}>{progressLabel} · папка по колу</Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: tracks.length ? `${((currentTrackIndex + 1) / tracks.length) * 100}%` : "0%" }]} />
          </View>
        </View>

        <Pressable onPress={toggleBroadcast} style={({ pressed }) => [styles.broadcastButton, { backgroundColor: isOnAir ? colors.error : colors.primary, opacity: pressed ? 0.86 : 1 }]}>
          <Text style={[styles.broadcastButtonText, { color: isOnAir ? colors.foreground : colors.background }]}>
            {isOnAir ? "Зупинити трансляцію" : "Запустити трансляцію"}
          </Text>
        </Pressable>

        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Музична папка</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{tracks.length ? `${tracks.length} MP3-файлів знайдено` : "Вибери папку з музикою"}</Text>
            </View>
            <Pressable onPress={chooseFolder} style={({ pressed }) => [styles.smallButton, { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.smallButtonText, { color: colors.primary }]}>Вибрати</Text>
            </Pressable>
          </View>
          <Text style={[styles.folderName, { color: colors.foreground }]} numberOfLines={1}>{settings.folderName}</Text>
          <Text style={[styles.endpoint, { color: colors.muted }]}>Caster.fm · {connectionSummary}</Text>
        </View>

        {!!lastError && <View style={[styles.errorBox, { backgroundColor: `${colors.error}18`, borderColor: colors.error }]}><Text style={[styles.errorText, { color: colors.error }]}>{lastError}</Text></View>}

        <Pressable onPress={() => setShowSettings((value) => !value)} style={styles.settingsToggle}>
          <Text style={[styles.settingsToggleText, { color: colors.foreground }]}>{showSettings ? "Сховати налаштування" : "Налаштування Caster.fm"}</Text>
          <Text style={[styles.chevron, { color: colors.muted }]}>{showSettings ? "⌃" : "⌄"}</Text>
        </Pressable>

        {showSettings && (
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingInput label="Server host" value={settings.host} onChangeText={(value) => updateSetting("host", value)} colors={colors} />
            <SettingInput label="Port" value={settings.port} onChangeText={(value) => updateSetting("port", value)} colors={colors} keyboardType="numeric" />
            <SettingInput label="Broadcast username" value={settings.username} onChangeText={(value) => updateSetting("username", value)} colors={colors} />
            <SettingInput label="Mount point" value={settings.mountPoint} onChangeText={(value) => updateSetting("mountPoint", value)} colors={colors} />
            <SettingInput label="Broadcast password" value={password} onChangeText={setPassword} onBlur={() => void saveSettings()} colors={colors} secureTextEntry />
            <ToggleRow label="Автоперепідключення" value={settings.autoReconnect} onValueChange={(value) => updateSetting("autoReconnect", value)} colors={colors} />
            <ToggleRow label="Автозапуск після перезапуску" value={settings.autoStart} onValueChange={(value) => updateSetting("autoStart", value)} colors={colors} />
          </View>
        )}

        <Text style={[styles.footerNote, { color: colors.muted }]}>Без мікрофона · тільки музика · телефон можна залишити із вимкненим екраном</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingInput({ label, colors, ...props }: { label: string; colors: ReturnType<typeof useColors> } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} />
    </View>
  );
}

function ToggleRow({ label, value, onValueChange, colors }: { label: string; value: boolean; onValueChange: (value: boolean) => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.foreground} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: { fontSize: 34, fontWeight: "800", marginTop: 4 },
  liveDot: { width: 14, height: 14, borderRadius: 7, marginRight: 4 },
  statusCard: { borderRadius: 22, borderWidth: 1, padding: 20, gap: 11 },
  statusTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusLabel: { fontSize: 13, fontWeight: "900", letterSpacing: 1.2 },
  bitrate: { fontSize: 12, fontWeight: "700" },
  trackName: { fontSize: 24, fontWeight: "800", lineHeight: 29, marginTop: 8 },
  trackMeta: { fontSize: 13 },
  progressTrack: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  progressFill: { height: "100%", borderRadius: 3 },
  broadcastButton: { minHeight: 62, alignItems: "center", justifyContent: "center", borderRadius: 17 },
  broadcastButtonText: { fontSize: 17, fontWeight: "900" },
  sectionCard: { borderRadius: 18, borderWidth: 1, padding: 17, gap: 13 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { fontSize: 12, marginTop: 4 },
  smallButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9 },
  smallButtonText: { fontSize: 13, fontWeight: "800" },
  folderName: { fontSize: 15, fontWeight: "700" },
  endpoint: { fontSize: 12 },
  errorBox: { borderWidth: 1, borderRadius: 14, padding: 13 },
  errorText: { fontSize: 13, lineHeight: 19, fontWeight: "600" },
  settingsToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  settingsToggleText: { fontSize: 15, fontWeight: "800" },
  chevron: { fontSize: 22 },
  settingsCard: { borderRadius: 18, borderWidth: 1, padding: 17, gap: 13 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 },
  toggleLabel: { fontSize: 14, fontWeight: "700" },
  footerNote: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 4 },
});
