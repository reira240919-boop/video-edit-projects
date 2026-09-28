// 公開する見本か、自分用か（`npm run dev:mine` のときだけ自分用）
// Vercel にはこの設定を入れないので、公開 URL は必ず見本になる
import { SAMPLE_TODAY } from "@/data/sampleProjects";

export const IS_MINE = process.env.NEXT_PUBLIC_DATA_MODE === "mine";

// パソコンの時計での今日（"YYYY-MM-DD"）
function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 見本は 2026-09-28 で固定。自分用は本当の今日
export const TODAY = IS_MINE ? localToday() : SAMPLE_TODAY;
