export const SUPPORTED_AUDIO_EXTENSIONS = [".mp3"] as const;

export function isSupportedAudioName(name: string) {
  return SUPPORTED_AUDIO_EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension));
}

export function sortTrackNames(names: string[]) {
  return [...names].sort((a, b) => a.localeCompare(b, "uk"));
}
