import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
import { audio } from './audio/LowLatencyAudio'
import { colors } from './theme'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: document.body,
  backgroundColor: colors.bgCss,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
  audio: {
    noAudio: true,
  },
  input: {
    activePointers: 1,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
}

document.getElementById('start-btn')!.addEventListener('click', () => {
  document.getElementById('overlay')!.classList.add('hidden')
  const ctx = new AudioContext()
  audio.setContext(ctx)
  new Phaser.Game(config)
})
