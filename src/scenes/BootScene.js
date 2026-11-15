import Phaser from "phaser";
import { CHARACTERS, SPRITE } from "../config.js";

// キャラ選択用の立ち絵をプリロードしてTitleSceneへ遷移する。
// ゲーム内スプライトは未用意のため、仮の四角形で進行している。
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    CHARACTERS.forEach(chara => {
      this.load.image(chara.portraitKey, chara.portraitPath);
      if (chara.spriteKey) {
        this.load.spritesheet(chara.spriteKey, chara.spritePath, {
          frameWidth: SPRITE.frameWidth,
          frameHeight: SPRITE.frameHeight
        });
      }
    });
  }

  createAnimations() {
    CHARACTERS.filter(chara => chara.spriteKey).forEach(chara => {
      Object.entries(SPRITE.anims).forEach(([name, def]) => {
        this.anims.create({
          key: `${chara.id}_${name}`,
          frames: this.anims.generateFrameNumbers(chara.spriteKey, { start: def.start, end: def.end }),
          frameRate: def.frameRate,
          repeat: def.repeat
        });
      });
    });
  }

  create() {
    this.createAnimations();
    this.scene.start("TitleScene");
  }
}
