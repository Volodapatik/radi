import { describe, expect, it } from "vitest";

import { isSupportedAudioName, sortTrackNames } from "../lib/track-utils";

describe("track utilities", () => {
  it("accepts MP3 files case-insensitively and rejects other formats in the MVP", () => {
    expect(isSupportedAudioName("01-opening.MP3")).toBe(true);
    expect(isSupportedAudioName("02-jingle.wav")).toBe(false);
  });

  it("sorts the folder deterministically by filename", () => {
    expect(sortTrackNames(["10-song.mp3", "02-song.mp3", "01-song.mp3"])).toEqual([
      "01-song.mp3",
      "02-song.mp3",
      "10-song.mp3",
    ]);
  });
});
