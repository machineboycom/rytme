import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
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
    disableWebAudio: false,
    noAudio: false,
  },
  input: {
    activePointers: 1,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
}

new Phaser.Game(config)
