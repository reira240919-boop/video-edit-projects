// 公開する見本用の架空データ（本物の顧客名・単価は入れない）
// 中身は index.html の projects と同じ値にそろえる

// 状態の一覧（プルダウンもこの順で出す）
export const STATUSES = [
  "相談中", "受注", "編集中", "確認待ち", "納品済み", "請求済み", "入金済み", "見送り",
] as const;

export type Status = (typeof STATUSES)[number];

export type Project = {
  id: string;
  name: string;
  director: string;
  type: "ショート" | "横動画";
  kind: "新規" | "継続";
  status: Status;
  start: string | null;
  due: string | null;
  delivered: string | null;
  price: number | null;
  billed: string | null;
  paid: string | null;
  payDue: string | null;
  next: string;
};

// 今日の日付（見本用に固定）
export const TODAY = "2026-09-28";

export const sampleProjects: Project[] = [
  { id: "p1", name: "商品紹介ショート", director: "山田", type: "ショート", kind: "継続", status: "編集中",
    start: "2026-09-20", due: "2026-09-30", delivered: null, price: 15000,
    billed: null, paid: null, payDue: "2026-10-31", next: "初稿を送る" },
  { id: "p2", name: "対談動画", director: "佐藤", type: "横動画", kind: "新規", status: "確認待ち",
    start: "2026-09-10", due: "2026-09-29", delivered: null, price: 40000,
    billed: null, paid: null, payDue: "2026-10-31", next: "修正を確認する" },
  { id: "p3", name: "リール3本", director: "山田", type: "ショート", kind: "継続", status: "納品済み",
    start: "2026-09-01", due: "2026-09-15", delivered: "2026-09-16", price: 30000,
    billed: null, paid: null, payDue: "2026-10-15", next: "請求書を出す" },
  { id: "p4", name: "採用動画", director: "鈴木", type: "横動画", kind: "新規", status: "入金済み",
    start: "2026-08-01", due: "2026-08-20", delivered: "2026-08-20", price: 50000,
    billed: "2026-08-21", paid: "2026-09-10", payDue: "2026-09-30", next: "なし" },
  { id: "p5", name: "イベント報告", director: "佐藤", type: "横動画", kind: "継続", status: "請求済み",
    start: "2026-09-05", due: "2026-09-18", delivered: "2026-09-18", price: 35000,
    billed: "2026-09-19", paid: null, payDue: "2026-10-10", next: "入金を確認する" },
  { id: "p6", name: "企画ショート", director: "高橋", type: "ショート", kind: "新規", status: "見送り",
    start: null, due: null, delivered: null, price: null,
    billed: null, paid: null, payDue: null, next: "なし" },
];
