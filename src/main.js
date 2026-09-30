import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./config.js";
import BootScene from "./scenes/BootScene.js";
import TitleScene from "./scenes/TitleScene.js";
import CharacterSelectScene from "./scenes/CharacterSelectScene.js";
import PlayScene from "./scenes/PlayScene.js";
import MaricoPuzzleActionScene from "./scenes/MaricoPuzzleActionScene.js";
import NikoRushActionScene from "./scenes/NikoRushActionScene.js";
import NinaEscapeRoomScene from "./scenes/NinaEscapeRoomScene.js";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#14121a",
  scale: {
    // ブラウザウィンドウいっぱいに、960:540のアスペクト比を保ったまま
    // 自動リサイズする。ウィンドウリサイズ時にも追従する。
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },
  scene: [
    BootScene,
    TitleScene,
    CharacterSelectScene,
    PlayScene,
    MaricoPuzzleActionScene,
    NikoRushActionScene,
    NinaEscapeRoomScene
  ]
});
