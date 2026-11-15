// タイトルロゴ（tools/title_logo.html）を、Webフォント込みで透過PNGに書き出す。
// ノベルパートのロゴ（Noto Serif JP + 色ずれ）と同じ見た目にするため、
// Google Fonts を取得できるネットワークが必要。
// 使い方: node tools/render_title_logo.mjs public/assets/ui/title_logo.png
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const out = resolve(process.argv[2] ?? "public/assets/ui/title_logo.png");
mkdirSync(dirname(out), { recursive: true });
const html = join(dirname(fileURLToPath(import.meta.url)), "title_logo.html");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 400 }, deviceScaleFactor: 2 });
await page.goto(`file://${html}`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500); // 日本語フォントは分割配信のため、読み込み完了を少し待つ
await (await page.$("#wrap")).screenshot({ path: out, omitBackground: true });
await browser.close();
console.log(`saved ${out}`);
