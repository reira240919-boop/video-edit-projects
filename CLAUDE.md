# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 要件

実装の指示書は `requirements.md`。機能 ID（F-01〜F-12）、見本データで出るべき数字、画面の決まりはここが正。仕様を変えたら `requirements.md` も合わせて直す。`index.html` は見た目の見本（入力の動きは入れない）で、見た目を変えたらこちらも合わせる。

## コマンド

- `npm run dev` — 公開する見本を http://localhost:3100 で起動（ポート 3000 は別プロジェクトが使用中）
- `npm run build` — 本番ビルド
- `npm run lint` — ESLint
- `npx tsc --noEmit` — 型チェック

テストの仕組みはない。

## 構成

1ページ（`/`）だけの Next.js App Router アプリ。データベースもログインもない。

- `data/sampleProjects.ts` — `Project` 型、状態の一覧 `STATUSES`、架空の見本6件、基準日 `TODAY`（2026-09-28 固定）
- `lib/projects.ts` — 計算だけの関数（絞り込み、並び順、件数・合計、月ごとの売上、状態を変えたときの日付の決まり `applyStatus`）。画面の部品には計算を書かない
- `lib/storage.ts` — 読み込み・保存の入り口。見本はブラウザの `localStorage` に保存し、保存がなければ見本6件を使う
- `components/ProjectBoard.tsx` — 画面全体（client component）。案件の配列・絞り込み・入力欄・お知らせの状態を持ち、変更は `update()` で画面と保存先の両方に反映する

大事な決まり:

- 日付は `"YYYY-MM-DD"` の文字列のまま比べる（時差で1日ずれないように）。月は `"YYYY-MM"`
- 上の数字（件数・合計・売上）は絞り込みに関係なく全件から計算する。絞り込みは上の表と見送りの表の両方にかける
- 見送りは本体の表から外して下の別の表に出す。入金済みは本体の表の一番下
- 表の左の2列（「⋯」ボタンと案件名）は横スクロールしても残す（`app/globals.css` の sticky 指定と `--actions-w`）

## 予定（まだ作っていない）

自分用（F-07）: `npm run dev:mine`（localhost:3101）で起動し、保存先をパソコン内の `my-data/projects.json` にする。`my-data/` は `.gitignore` に入れる。公開 URL ではファイルに書き込む仕組みを動かさない。自分用では「最初の6件に戻す」ボタンを出さず、今日の日付は本当の今日を使う。
