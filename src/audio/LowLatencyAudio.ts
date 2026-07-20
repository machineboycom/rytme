export class LowLatencyAudio {
  private ctx: AudioContext | null = null
  private rimBuffer: AudioBuffer | null = null
  private snare1Buffer: AudioBuffer | null = null
  private snare2Buffer: AudioBuffer | null = null
  private snareIndex = 0

  setContext(ctx: AudioContext): void {
    this.ctx = ctx
  }

  getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' })
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  private async ensureRim(): Promise<AudioBuffer> {
    if (!this.rimBuffer) {
      this.rimBuffer = await this.loadSample('/audio/rim.wav')
    }
    return this.rimBuffer
  }

  private async ensureSnare(idx: number): Promise<AudioBuffer> {
    if (idx === 0) {
      if (!this.snare1Buffer) {
        this.snare1Buffer = await this.loadSample('/audio/snare1.wav')
      }
      return this.snare1Buffer
    }
    if (!this.snare2Buffer) {
      this.snare2Buffer = await this.loadSample('/audio/snare2.wav')
    }
    return this.snare2Buffer
  }

  async loadSample(url: string): Promise<AudioBuffer> {
    const ctx = this.getContext()
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    return ctx.decodeAudioData(arrayBuffer)
  }

  private playBuffer(buffer: AudioBuffer, time: number, volume = 1, playbackRate = 1): void {
    const ctx = this.getContext()
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = playbackRate
    if (volume !== 1) {
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(volume, time)
      source.connect(gain)
      gain.connect(ctx.destination)
    } else {
      source.connect(ctx.destination)
    }
    source.start(time)
  }

  scheduleRim(time: number, accent: boolean): void {
    this.ensureRim().then((buf) => this.playBuffer(buf, time, accent ? 0.8 : 0.4)).catch(() => {})
  }

  private randomRate(): number {
    return 1 + (Math.random() * 2 - 1) * 0.01
  }

  private playSnareAt(time: number): void {
    const idx = this.snareIndex % 2
    this.snareIndex++
    const rate = this.randomRate()
    this.ensureSnare(idx).then((buf) => this.playBuffer(buf, time, 0.7, rate)).catch(() => {})
  }

  scheduleSnare(time: number): void {
    this.playSnareAt(time)
  }

  playSnareNow(): void {
    this.playSnareAt(this.currentTime)
  }

  scheduleBuzz(time: number): void {
    this.ensureRim().then((buf) => this.playBuffer(buf, time, 0.2)).catch(() => {})
  }

  get currentTime(): number {
    return this.getContext().currentTime
  }
}

export const audio = new LowLatencyAudio()
