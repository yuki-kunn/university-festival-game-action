import Phaser from "phaser";
import { CHARACTERS } from "../config.js";

// キャラ選択用の立ち絵をプリロードしてTitleSceneへ遷移する。
// ゲーム内スプライトは未用意のため、仮の四角形で進行している。
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    CHARACTERS.forEach(chara => {
      this.load.image(chara.portraitKey, chara.portraitPath);
    });
  }

  create() {
    this.scene.start("TitleScene");
  }
}
