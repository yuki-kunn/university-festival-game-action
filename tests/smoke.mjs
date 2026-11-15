// スモークテスト: ビルド済みの dist を vite preview で配信し、ヘッドレス
// Chromium で全キャラのシーンがエラーなく起動することを確認する。
// 使い方: npm run build && npm test
import { chromium } from "playwright";
import { preview } from "vite";

const GAME_W = 960;
const GAME_H = 540;
const PORT = 4173;

const CHARACTERS = [
  { id: "mc", sceneKey: "PlayScene", cardX: 174 },
  { id: "marico", sceneKey: "MaricoPuzzleActionScene", cardX: 378 },
  { id: "niko", sceneKey: "NikoRushActionScene", cardX: 582 },
  { id: "nina", sceneKey: "NinaEscapeRoomScene", cardX: 786 }
];

const server = await preview({ preview: { port: PORT, strictPort: true, open: false } });
const browser = await chromium.launch();
const failures = [];

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function runCase(chara) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e}`));
  page.on("console", m => m.type() === "error" && errors.push(`console: ${m.text()}`));
  page.on("requestfailed", r => errors.push(`requestfailed: ${r.url()}`));

  try {
    await page.goto(`http://localhost:${PORT}/?debug`);
    await page.waitForFunction(() => window.game?.scene.isActive("TitleScene"), null, { timeout: 15000 });

    const box = await (await page.$("canvas")).boundingBox();
    const click = (gx, gy) => page.mouse.click(box.x + (gx / GAME_W) * box.width, box.y + (gy / GAME_H) * box.height);

    await click(GAME_W / 2, GAME_H / 2 + 60); // はじめる
    await page.waitForFunction(() => window.game.scene.isActive("CharacterSelectScene"), null, { timeout: 5000 });
    await click(chara.cardX, GAME_H / 2 + 20); // キャラカード
    await page.waitForFunction(key => window.game.scene.isActive(key), chara.sceneKey, { timeout: 5000 });
    await page.waitForTimeout(500);

    if (chara.id === "nina") {
      const result = await page.evaluate(() => {
        const s = window.game.scene.getScenes(true)[0];
        // 依存関係の順に全オブジェクトを調べ、集まったヒントから正解コードを組み立てる
        for (const id of ["crystal", "bookshelf", "note", "box", "drawer", "photo"]) {
          s.handleObjectClick(s.room.objects.find(o => o.id === id));
        }
        const code = ["A", "B", "C", "D"].map(k => s.hints[k]).join("");
        s.openCodeInput();
        for (const ch of "0000") s.inputDigit(ch);
        s.submitCode();
        const attemptsAfterWrong = s.attemptsLeft;
        s.openCodeInput();
        for (const ch of code) s.inputDigit(ch);
        s.submitCode();
        return { code, expected: s.room.code, attemptsAfterWrong, finished: s.isFinished };
      });
      assert(result.code === result.expected, `ヒントから作ったコード(${result.code})が正解(${result.expected})と一致しない`);
      assert(result.attemptsAfterWrong === 2, "誤ったコードで残り試行回数が減らない");
      assert(result.finished, "正解コードで脱出できない");
    } else {
      // 開始位置は床より高いので、着地するまで待つ（ヘッドレスは描画が遅い）
      await page
        .waitForFunction(() => window.game.scene.getScenes(true)[0].player?.body.blocked.down, null, { timeout: 10000 })
        .catch(() => {});
      const info = await page.evaluate(() => {
        const s = window.game.scene.getScenes(true)[0];
        return {
          body: [s.player.body.width, s.player.body.height],
          onGround: s.player.body.blocked.down,
          platforms: s.platformGroup.getChildren().length,
          gameOver: s.isGameOver
        };
      });
      assert(info.body[0] === 36 && info.body[1] === 56, `当たり判定が36x56でない: ${info.body}`);
      assert(info.onGround, "開始後に床へ接地していない");
      assert(info.platforms > 0, "床が生成されていない");
      assert(!info.gameOver, "開始直後にゲームオーバーになっている");
    }
    assert(errors.length === 0, `ブラウザエラー: ${errors.join(" | ")}`);
    console.log(`PASS ${chara.id}`);
  } catch (e) {
    failures.push(`${chara.id}: ${e.message}`);
    console.error(`FAIL ${chara.id}: ${e.message}`);
  } finally {
    await page.close();
  }
}

for (const chara of CHARACTERS) await runCase(chara);

await browser.close();
await server.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} 件失敗`);
  process.exit(1);
}
console.log("\nすべて成功");
