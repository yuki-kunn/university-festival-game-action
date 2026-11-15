import { GAME_WIDTH, GAME_HEIGHT, TEXT_RESOLUTION } from "../config.js";

const BANNER_KEYS = { clear: "banner_clear", miss: "banner_miss", escape: "banner_escape" };
const BANNER_WIDTH = 520;
const DEPTH = 100;
const SPARK_TINTS = [0xffd24c, 0xf08cc0, 0x8cbdf0, 0x8cf0c0];

// 結果バナーの演出。kind は "clear" | "miss" | "escape"。
// miss は画面フラッシュとシェイク、clear / escape は紙吹雪（キラキラ）と
// キャラの立ち絵を出す。すべてカメラに追従しない（スクロールしない）。
export function showResultBanner(scene, kind, { subText = "", portraitKey = null } = {}) {
  const centerX = GAME_WIDTH / 2;
  const centerY = GAME_HEIGHT / 2 - 20;

  const dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTH);
  scene.tweens.add({ targets: dim, alpha: kind === "miss" ? 0.45 : 0.55, duration: 250 });

  if (kind === "miss") {
    scene.cameras.main.flash(160, 255, 70, 90);
    scene.cameras.main.shake(260, 0.012);
  }

  if (portraitKey) {
    const portrait = scene.add.image(GAME_WIDTH + 160, GAME_HEIGHT, portraitKey).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH + 1);
    portrait.setScale(300 / portrait.height);
    scene.tweens.add({ targets: portrait, x: GAME_WIDTH - 150, duration: 520, delay: 250, ease: "Back.easeOut" });
  }

  const banner = scene.add.image(centerX, centerY, BANNER_KEYS[kind]).setScrollFactor(0).setDepth(DEPTH + 2);
  const baseScale = BANNER_WIDTH / banner.width;
  banner.setScale(baseScale * 0.2).setAlpha(0);
  scene.tweens.add({ targets: banner, scale: baseScale, alpha: 1, duration: 380, ease: "Back.easeOut" });

  if (subText) {
    const sub = scene.add
      .text(centerX, centerY + 96, subText, {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#f5f3fa",
        backgroundColor: "rgba(20,18,26,0.75)",
        padding: { x: 14, y: 6 },
        resolution: TEXT_RESOLUTION
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2)
      .setAlpha(0);
    scene.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 350 });
  }

  if (kind !== "miss") {
    const burst = (x, y, count, delay) => {
      scene.time.delayedCall(delay, () => {
        const emitter = scene.add.particles(x, y, "spark", {
          speed: { min: 140, max: 420 },
          angle: { min: 200, max: 340 },
          gravityY: 520,
          lifespan: 1500,
          scale: { start: 0.9, end: 0 },
          alpha: { start: 1, end: 0 },
          rotate: { min: 0, max: 360 },
          tint: SPARK_TINTS,
          emitting: false
        });
        emitter.setScrollFactor(0).setDepth(DEPTH + 1); // バナー（DEPTH+2）の背面に置き、文字を隠さない
        emitter.explode(count);
        scene.time.delayedCall(2000, () => emitter.destroy());
      });
    };
    burst(centerX, centerY - 60, 60, 150);
    burst(centerX - 220, centerY - 40, 30, 650);
    burst(centerX + 220, centerY - 40, 30, 650);
  }
}

// 演出のあと、指定の処理（次のステージへ・タイトルへ等）に進む。
// 少し待ってからはクリックで早送りできる。
export function proceedAfter(scene, ms, action) {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    action();
  };
  scene.time.delayedCall(ms, go);
  scene.time.delayedCall(900, () => scene.input.once("pointerdown", go));
}

export function returnToTitleAfter(scene, ms) {
  proceedAfter(scene, ms, () => scene.scene.start("TitleScene"));
}
