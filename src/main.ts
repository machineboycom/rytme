import Phaser from 'phaser'
import { PreloadScene } from './scenes/PreloadScene'
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
  scene: [PreloadScene, GameScene],
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
  new Phaser.Game(config)
})
