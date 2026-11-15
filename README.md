# 不在証明（ALIBI） - Action Part

大学文化祭展示用の2Dアクションゲーム。姉妹プロジェクト「[不在証明（ALIBI）](https://github.com/yuki-kunn/university-festival-game)」（ノベル/RPGパート）とキャラクター・世界観を共有する、横スクロールアクションゲームです。

ストーリー上の連動はなく、完全に独立したゲームとして遊べます。

## 概要

- ジャンル: 横スクロールアクション（プラットフォーマー）
- 操作キャラ: マリコ / ニコ / ニナ / 主人公（4種から選択、能力差あり）
- ステージ数: 3〜5
- フレームワーク: [Phaser 3](https://phaser.io/)

詳細な仕様は [GAME_SPEC.md](./GAME_SPEC.md) を参照してください。

## セットアップ

```bash
npm install
npm run dev
```

## テスト

```bash
npm run build
npx playwright install chromium   # 初回のみ
npm test
```

PR と push では GitHub Actions が同じビルド・テストを実行し、develop / main への push 後は Cloudflare Pages へデプロイします（詳細は [CLAUDE.md](./CLAUDE.md)）。

## 素材の再生成

ゲーム内の画像は `tools/` のスクリプトで生成している（`pip install pillow` が必要）。
元の立ち絵・背景はノベルパートの素材（Google Drive 保管）で、リポジトリには含めていない。

| 出力 | スクリプト |
|------|-----------|
| ミニスプライト（`public/assets/sprites`） | `tools/make_mini_sprites.py SRC_DIR OUT_DIR` |
| ステージ部品・背景（`public/assets/stage`） | `tools/make_stage_assets.py SRC_DIR OUT_DIR` |
| ニナの部屋（`public/assets/nina`） | `tools/make_nina_assets.py OUT_DIR` |
| タイトル・選択画面・結果演出（`public/assets/ui`） | `tools/make_ui_assets.py SRC_DIR OUT_DIR` |
| タイトルロゴ（`public/assets/ui/title_logo.png`） | `node tools/render_title_logo.mjs OUT_PNG`（要ネットワーク） |

## 開発ルール

開発ルール・Git ワークフローは [CLAUDE.md](./CLAUDE.md) を参照してください。
