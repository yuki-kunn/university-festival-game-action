import Phaser from "phaser";

// 現時点ではロードすべき外部アセットがない（ドット絵未用意のため仮の
// 四角形プレースホルダーで進行）ので、BootSceneは即座にTitleSceneへ
// 遷移するだけの土台。将来スプライトシート等を追加したら、この
// preload()でロードする。
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {}

  create() {
    this.scene.start("TitleScene");
  }
}
