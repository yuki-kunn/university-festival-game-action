import Phaser from "phaser";
import { applyMutePreference, preloadAudio } from "../audio.js";
import { CHARACTERS, NINA_ART, SPRITE, STAGE_ART, UI_ART } from "../config.js";

// キャラ選択用の立ち絵をプリロードしてTitleSceneへ遷移する。
// ゲーム内スプライトは未用意のため、仮の四角形で進行している。
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.preloadAudio();
    this.preloadStageArt();
    this.preloadNinaArt();
    this.preloadUiArt();
    CHARACTERS.forEach(chara => {
      this.load.image(chara.portraitKey, chara.portraitPath);
      if (chara.bgKey) {
        this.load.image(chara.bgKey, chara.bgPath);
      }
      if (chara.spriteKey) {
        this.load.spritesheet(chara.spriteKey, chara.spritePath, {
          frameWidth: SPRITE.frameWidth,
          frameHeight: SPRITE.frameHeight
        });
      }
    });
  }

  preloadAudio() {
    preloadAudio(this);
  }

  preloadUiArt() {
    Object.entries(UI_ART.images).forEach(([key, file]) => this.load.image(key, `${UI_ART.path}/${file}`));
  }

  preloadNinaArt() {
    NINA_ART.walls.forEach(w => this.load.image(`room_wall_${w}`, `${NINA_ART.path}/room_wall_${w}.png`));
    NINA_ART.objects.forEach(o => this.load.image(`obj_${o}`, `${NINA_ART.path}/obj_${o}.png`));
  }

  preloadStageArt() {
    Object.entries(STAGE_ART.images).forEach(([key, path]) => this.load.image(key, path));
    Object.entries(STAGE_ART.extraBackgrounds).forEach(([key, path]) => this.load.image(key, path));
    this.load.spritesheet("coin", STAGE_ART.coin.path, {
      frameWidth: STAGE_ART.coin.frameSize,
      frameHeight: STAGE_ART.coin.frameSize
    });
  }

  createAnimations() {
    this.anims.create({
      key: "coin_spin",
      frames: this.anims.generateFrameNumbers("coin", { start: 0, end: 5 }),
      frameRate: STAGE_ART.coin.frameRate,
      repeat: -1
    });

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
    applyMutePreference(this.game);
    this.createAnimations();
    this.scene.start("TitleScene");
  }
}
