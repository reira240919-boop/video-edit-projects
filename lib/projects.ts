// 計算だけの関数をまとめる（画面の部品には計算を書かない）
// 日付は "YYYY-MM-DD" の文字列のまま比べる（時差で1日ずれないように）
import { STATUSES, type Project, type Status } from "@/data/sampleProjects";

export function yen(n: number): string {
  return n.toLocaleString("ja-JP") + "円";
}

// 納品済み・請求済みで、入金日が空のもの
export function isUnpaid(p: Project): boolean {
  return (p.status === "納品済み" || p.status === "請求済み") && p.paid == null;
}

// 進行中の件数（編集中・提出済み）
export function countInProgress(projects: Project[]): number {
  return projects.filter((p) => p.status === "編集中" || p.status === "提出済み").length;
}

// 未入金の合計（円）
export function sumUnpaid(projects: Project[]): number {
  return projects.filter(isUnpaid).reduce((sum, p) => sum + (p.price ?? 0), 0);
}

// 状態を変えるときの日付の決まり
// - 納品済み・請求済み・入金済みにしたとき、対応する日付が空なら今日の日付を入れる（入っていれば上書きしない）
// - 状態を前に戻したときは、戻した先より後の段階の日付を消す（例: 入金済み → 提出済み なら 納品日・請求日・入金日を消す）
// - 見送りにしたときは、日付を変えない
const DATE_STEPS = [
  { status: "納品済み", key: "delivered" },
  { status: "請求済み", key: "billed" },
  { status: "入金済み", key: "paid" },
] as const;

export function applyStatus(p: Project, status: Status, today: string): Project {
  const next = { ...p, status };
  if (status === "見送り") return next;
  const rank = STATUSES.indexOf(status);
  for (const step of DATE_STEPS) {
    if (step.status === status && next[step.key] == null) next[step.key] = today;
    if (rank < STATUSES.indexOf(step.status)) next[step.key] = null;
  }
  return next;
}

// ---- 月ごとの売上 ----
// 月は "YYYY-MM" の文字列で扱う

// 入金予定: 見送り以外で、まだ入金されていないもの（編集中・提出済みも含む）
function isPlanned(p: Project): boolean {
  return p.status !== "見送り" && p.paid == null && p.payDue != null;
}

// その月の 入金済み（入金日の月）と 入金予定（支払予定日の月）の合計
export function salesOfMonth(projects: Project[], month: string) {
  const paid = projects
    .filter((p) => p.paid?.startsWith(month))
    .reduce((sum, p) => sum + (p.price ?? 0), 0);
  const planned = projects
    .filter((p) => isPlanned(p) && p.payDue!.startsWith(month))
    .reduce((sum, p) => sum + (p.price ?? 0), 0);
  return { paid, planned, total: paid + planned };
}

// プルダウンに出す月の一覧（今月＋入金日・支払予定日がある月。新しい月が上）
export function salesMonths(projects: Project[], today: string): string[] {
  const months = new Set<string>([today.slice(0, 7)]);
  for (const p of projects) {
    if (p.paid) months.add(p.paid.slice(0, 7));
    if (isPlanned(p)) months.add(p.payDue!.slice(0, 7));
  }
  return [...months].sort().reverse();
}

// "2026-09" → "2026年9月"
export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${Number(m)}月`;
}

// 入金済みは完了なので一番下にまとめる
function isDone(p: Project): boolean {
  return p.status === "入金済み";
}

// 提出予定日が近い順（予定日なしは最後）。完了したものはその下
export function sortByDue(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1;
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });
}

// ---- 絞り込み ----
// all: すべて / week: 今週提出 / unpaid: 未入金 / director: 担当Dごと
export type Filter =
  | { kind: "all" }
  | { kind: "week" }
  | { kind: "unpaid" }
  | { kind: "director"; name: string };

// "YYYY-MM-DD" に日数を足す（UTC で計算するので時差でずれない）
function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// まだ自分が出していない（相談中・受注・編集中）。提出済みから先と見送りは、自分の番ではない
function isMyTurn(p: Project): boolean {
  return STATUSES.indexOf(p.status) < STATUSES.indexOf("提出済み");
}

// 今週提出: 自分の番で、提出予定日が今日から7日以内
function isDueThisWeek(p: Project, today: string): boolean {
  return isMyTurn(p) && p.due != null && p.due >= today && p.due <= addDays(today, 7);
}

export function filterProjects(projects: Project[], filter: Filter, today: string): Project[] {
  switch (filter.kind) {
    case "week":
      return projects.filter((p) => isDueThisWeek(p, today));
    case "unpaid":
      return projects.filter(isUnpaid);
    case "director":
      return projects.filter((p) => p.director === filter.name);
    default:
      return projects;
  }
}

// プルダウンに出す担当Dの一覧（データに出てくる順）
export function directorNames(projects: Project[]): string[] {
  return [...new Set(projects.map((p) => p.director))];
}

// 分単価×分数（円。1円未満は四捨五入）
export function perMinuteTotal(perMinute: number, minutes: number): number {
  return Math.round(perMinute * minutes);
}

// 会社名を比べるときは空白（全角も）を無視する（「TCB FILMS 松川」と「TCB FILMS　松川」を同じにする）
export function sameCompany(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/[\s\u3000]/g, "");
  return norm(a) === norm(b);
}

// 入れたことのある会社名（入力欄の候補に出す）
export function companyNames(projects: Project[]): string[] {
  return [...new Set(projects.flatMap((p) => (p.company ? [p.company] : [])))];
}

// 自分の番なのに提出予定日を過ぎている（提出済みはクライアントの番なので赤くしない）
export function isOverdue(p: Project, today: string): boolean {
  return isMyTurn(p) && p.due != null && p.due < today;
}
