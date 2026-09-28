# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 要件

実装の指示書は `requirements.md`。機能 ID（F-01〜F-12）、見本データで出るべき数字、画面の決まりはここが正。仕様を変えたら `requirements.md` も合わせて直す。`index.html` は見た目の見本（入力の動きは入れない）で、見た目を変えたらこちらも合わせる。

## コマンド

- `npm run dev` — 公開する見本を http://localhost:3100 で起動（ポート 3000 は別プロジェクトが使用中）
- `npm run dev:mine` — 自分用を開発モードで http://localhost:3102 に起動
- `npm run mine:update` — 自分用を組み立て直して、自動起動している方（3101）を再起動する。自分用に効くコードを直したら実行する
- `npm run build` — 本番ビルド
- `npm run lint` — ESLint
- `npx tsc --noEmit` — 型チェック

テストの仕組みはない。

## 構成

1ページ（`/`）だけの Next.js App Router アプリ。データベースもログインもない。

- `data/sampleProjects.ts` — `Project` 型、状態の一覧 `STATUSES`、架空の見本6件、見本の基準日 `SAMPLE_TODAY`（2026-09-28）
- `lib/projects.ts` — 計算だけの関数（絞り込み、並び順、件数・合計、月ごとの売上、状態を変えたときの日付の決まり `applyStatus`）。画面の部品には計算を書かない
- `lib/storage.ts` — 読み込み・保存の入り口。見本はブラウザの `localStorage` に保存し、保存がなければ見本6件を使う
- `components/ProjectBoard.tsx` — 画面全体（client component）。案件の配列・絞り込み・入力欄・お知らせの状態を持ち、変更は `update()` で画面と保存先の両方に反映する

大事な決まり:

- 日付は `"YYYY-MM-DD"` の文字列のまま比べる（時差で1日ずれないように）。月は `"YYYY-MM"`
- 上の数字（件数・合計・売上）は絞り込みに関係なく全件から計算する。絞り込みは上の表と見送りの表の両方にかける
- 見送りは本体の表から外して下の別の表に出す。入金済みは本体の表の一番下
- 表の左の2列（「⋯」ボタンと案件名）は横スクロールしても残す（`app/globals.css` の sticky 指定と `--actions-w`）

## 見本と自分用

`NEXT_PUBLIC_DATA_MODE=mine` のときだけ自分用（`lib/mode.ts` の `IS_MINE`）。`*:mine` のコマンドがこれを付けて `127.0.0.1` だけで起動し、`distDir` を `.next-mine` に分ける（`next.config.ts`）。

自分用はログイン時に自動で起動している: `~/Library/LaunchAgents/com.m39.video-edit-projects-mine.plist`（`npm run start:mine` を 3101 で実行し、止まったら起動し直す）。ログは `~/Library/Logs/video-edit-projects-mine.*.log`。止める: `launchctl bootout gui/$(id -u)/com.m39.video-edit-projects-mine`

- 保存先: 見本はブラウザの `localStorage`、自分用は `app/api/projects/route.ts` 経由で `my-data/projects.json`。この API は自分用以外では 404 を返す
- `my-data/` と `.next-mine/` は `.gitignore` 済み。Vercel に `NEXT_PUBLIC_DATA_MODE` を設定しないこと（公開 URL は必ず見本になる）
- 自分用で読めなかったときは見本に切りかえずエラーを出す（本物の記録と見本を混ぜない）
- 今日の日付は `lib/mode.ts` の `TODAY`（見本は 2026-09-28 固定、自分用は本当の今日）。自分用では「最初の6件に戻す」を出さない
