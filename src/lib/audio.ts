
/**
 * Birthday song player.
 *
 * Put your MP3 file here:
 * public/song.mp3
 *
 * Works with:
 * - Vite development server
 * - Local production build
 * - GitHub Pages
 */

export const SONG_SRC = `${import.meta.env.BASE_URL}song.mp3`;

class BirthdayPlayer {
  private audio: HTMLAudioElement | null = null;
  private playing = false;
  private failed = false;

  private ensure(): HTMLAudioElement {
    if (!this.audio) {
      const audio = new Audio(SONG_SRC);

      audio.loop = true;
      audio.preload = "none";
      audio.volume = 0.78;

      audio.addEventListener("error", () => {
        this.failed = true;
        this.playing = false;
      });

      audio.addEventListener("play", () => {
        this.playing = true;
      });

      audio.addEventListener("pause", () => {
        this.playing = false;
      });

      audio.addEventListener("ended", () => {
        this.playing = false;
      });

      this.audio = audio;
    }

    return this.audio;
  }

  /**
   * Starts or pauses the birthday song.
   *
   * Returns true if playback starts or pauses successfully.
   * Returns false if the audio cannot be played.
   */
  async toggle(on: boolean): Promise<boolean> {
    const audio = this.ensure();

    if (!on) {
      audio.pause();
      this.playing = false;
      return true;
    }

    if (this.failed) {
      this.failed = false;
      audio.src = SONG_SRC;
      audio.load();
    }

    try {
      await audio.play();

      this.playing = true;
      this.failed = false;

      return true;
    } catch (error) {
      console.error("Unable to play birthday song:", error);

      this.playing = false;
      this.failed = true;

      return false;
    }
  }

  /**
   * Stops the song and resets it to the beginning.
   */
  stop(): void {
    this.playing = false;

    if (this.audio) {
      this.audio.pause();

      try {
        this.audio.currentTime = 0;
      } catch {
        // Audio metadata may not have loaded yet.
      }
    }
  }

  /**
   * Returns whether the song is currently playing.
   */
  isPlaying(): boolean {
    return this.playing;
  }
}

export const birthdayPlayer = new BirthdayPlayer();
