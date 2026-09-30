import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./config.js";
import BootScene from "./scenes/BootScene.js";
import TitleScene from "./scenes/TitleScene.js";
import CharacterSelectScene from "./scenes/CharacterSelectScene.js";
import PlayScene from "./scenes/PlayScene.js";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#14121a",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  scene: [BootScene, TitleScene, CharacterSelectScene, PlayScene]
});
