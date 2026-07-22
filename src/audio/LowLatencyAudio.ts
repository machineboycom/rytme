export class LowLatencyAudio {
  private scene: Phaser.Scene | null = null
  private snareIndex = 0

  setScene(scene: Phaser.Scene): void {
    this.scene = scene
  }

  private getSound(): Phaser.Sound.BaseSoundManager {
    return this.scene!.sound
  }

  get currentTime(): number {
    const ctx = (this.getSound() as Phaser.Sound.WebAudioSoundManager).context
    return ctx.currentTime
  }

  scheduleRim(time: number, accent: boolean): void {
    const delay = Math.max(0, time - this.currentTime)
    this.getSound().play('rim', {
      delay,
      volume: accent ? 0.8 : 0.4,
    })
  }

  private playSnareAt(time: number): void {
    const delay = Math.max(0, time - this.currentTime)
    const idx = this.snareIndex % 2
    this.snareIndex++
    const rate = 1 + (Math.random() * 2 - 1) * 0.01
    this.getSound().play(`snare${idx + 1}`, {
      delay,
      volume: 0.7,
      rate,
    })
  }

  scheduleSnare(time: number): void {
    this.playSnareAt(time)
  }

  playSnareNow(): void {
    this.playSnareAt(this.currentTime)
  }

  scheduleBuzz(time: number): void {
    const delay = Math.max(0, time - this.currentTime)
    this.getSound().play('rim', {
      delay,
      volume: 0.2,
    })
  }
}

export const audio = new LowLatencyAudio()
