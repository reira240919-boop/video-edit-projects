// 「請求書を発行」: 案件1件を、請求書のスプレッドシート（「請求データ」シート）の空いている行に書き込む
// PDF はこれまでどおり、スプレッドシートのメニュー「請求書 → 選択した行のPDFを発行」で作る
// GET: 取引先マスタの「取引内容」に {分単価} を使っている会社の一覧（入力欄で分単価の欄を最初から出すため）
// 自分用のときだけ動く。公開 URL では 404 を返す
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Project } from "@/data/sampleProjects";
import { sheetsRequest } from "@/lib/googleSheets";
import { sameCompany } from "@/lib/projects";

export const dynamic = "force-dynamic";

const IS_MINE = process.env.NEXT_PUBLIC_DATA_MODE === "mine";
const FILE = path.join(process.cwd(), "my-data", "projects.json");
const SHEET = "請求データ";
const MASTER_SHEET = "取引先マスタ";
const SHEET_ID = 0; // 「請求データ」シートの番号（URL の gid）

const notFound = () => new Response("Not Found", { status: 404 });
const fail = (error: string, status = 400) => Response.json({ error }, { status });

type ValueRange = { values?: string[][] };
type SheetMeta = { sheets: { properties: { sheetId: number; gridProperties: { rowCount: number } } }[] };

// 「請求データ」の見出し。列の場所は決め打ちせず、見出しの名前で探す（列を足したり並べかえたりしても壊れないように）
const COLUMNS = {
  number: "請求書番号",
  issued: "発行日",
  workDate: "取引日(納品完了日)",
  client: "取引先名",
  honorific: "敬称",
  name: "案件名",
  amount: "入力金額",
  taxType: "区分",
  subtotal: "金額(税抜)",
  tax: "消費税(10%)",
  total: "合計金額(税込)",
  dueDate: "支払期限",
  perMinute: "分単価",
  minutes: "分数",
  endClient: "クライアント名",
  videoType: "動画の種類",
} as const;
type ColumnKey = keyof typeof COLUMNS;

// 0 から数えた列の番号を、A・B…Z・AA の形にする
function columnLetter(index: number): string {
  let s = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

// 見出しの行から、それぞれの列の文字（A・B…）を探す。見つからない見出しがあれば、その名前を返す
function findColumns(header: string[]): { letters: Record<ColumnKey, string>; missing: string[] } {
  const letters = {} as Record<ColumnKey, string>;
  const missing: string[] = [];
  for (const [key, title] of Object.entries(COLUMNS) as [ColumnKey, string][]) {
    const index = header.indexOf(title);
    if (index === -1) missing.push(title);
    else letters[key] = columnLetter(index);
  }
  return { letters, missing };
}

// その行の計算式（請求書番号・税抜・消費税・税込）。スプレッドシートに前から入っているものと同じ形で、列の文字だけ見出しから決める
function formulas(row: number, c: Record<ColumnKey, string>) {
  const amount = `$${c.amount}${row}`;
  const taxType = `$${c.taxType}${row}`;
  return {
    number: `=IF(${c.issued}${row}="","","INV-"&TEXT(${c.issued}${row},"yyyymm")&"-"&TEXT(ROW()-1,"000"))`,
    subtotal: `=IF(${amount}="","",IF(${taxType}="税込",ROUND(${amount}/1.1,0),${amount}))`,
    tax: `=IF(${amount}="","",IF(${taxType}="税込",${amount}-${c.subtotal}${row},ROUND(${c.subtotal}${row}*0.1,0)))`,
    total: `=IF(${amount}="","",IF(${taxType}="税込",${amount},${c.subtotal}${row}+${c.tax}${row}))`,
  };
}

// 取引先マスタの、会社名と「取引内容」のひな形の組
async function readLineItemTemplates(spreadsheetId: string): Promise<{ company: string; template: string }[]> {
  const { values = [] } = await sheetsRequest<ValueRange>(
    spreadsheetId, `/values/${encodeURIComponent(`${MASTER_SHEET}!A1:Z`)}`,
  );
  const [header = [], ...rows] = values;
  const col = header.indexOf("取引内容");
  if (col === -1) return [];
  return rows.filter((r) => r[0]).map((r) => ({ company: r[0], template: r[col] ?? "" }));
}

export async function GET() {
  if (!IS_MINE) return notFound();
  const spreadsheetId = process.env.INVOICE_SPREADSHEET_ID;
  if (!spreadsheetId) return fail(".env.local に INVOICE_SPREADSHEET_ID がありません", 500);
  try {
    const templates = await readLineItemTemplates(spreadsheetId);
    const using = (word: string) => templates.filter((t) => t.template.includes(word)).map((t) => t.company);
    return Response.json({ perMinuteCompanies: using("{分単価}") });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "取引先マスタを読めませんでした", 502);
  }
}

export async function POST(request: Request) {
  if (!IS_MINE) return notFound();
  const spreadsheetId = process.env.INVOICE_SPREADSHEET_ID;
  if (!spreadsheetId) return fail(".env.local に INVOICE_SPREADSHEET_ID がありません", 500);

  const body = await request.json().catch(() => null);
  const id: unknown = body?.id;
  const today: unknown = body?.today;
  if (typeof id !== "string" || typeof today !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return fail("送られた内容の形が正しくありません");
  }

  // 書き込む中身は、画面からではなく保存してあるファイルから読む
  const projects: Project[] = JSON.parse(await readFile(FILE, "utf8").catch(() => "[]"));
  const p = projects.find((x) => x.id === id);
  if (!p) return fail("案件が見つかりませんでした。画面を開き直してください", 404);
  if (p.status !== "納品済み") return fail("請求書を発行できるのは納品済みの案件だけです");
  if (!p.company) return fail("会社名が空です。「編集」で会社名を入れてから発行してください");
  if (p.price == null) return fail("単価が空です。「編集」で単価を入れてから発行してください");

  try {
    // その会社の取引内容で、クライアント名・動画の種類を使うか（使う会社だけ、その列に書く）
    const template = (await readLineItemTemplates(spreadsheetId))
      .find((t) => sameCompany(t.company, p.company!))?.template ?? "";
    const usesClient = template.includes("{クライアント名}");
    const usesVideoType = template.includes("{動画の種類}");
    // 前に保存した案件は種類が「横動画」のままのことがある（画面で開いて保存すると「ロング」になる）
    const videoType = (p.type as string) === "横動画" ? "ロング" : p.type;
    if (usesClient && !p.client) {
      return fail("クライアント名が空です。「編集」でクライアント名を入れてから発行してください");
    }

    // 見出しの行と中身を読み、列の場所を見出しの名前で決める
    const { values: sheetValues = [] } = await sheetsRequest<ValueRange>(
      spreadsheetId, `/values/${encodeURIComponent(`${SHEET}!A1:ZZ`)}`,
    );
    const [header = [], ...values] = sheetValues;
    const { letters, missing } = findColumns(header);
    if (missing.length > 0) {
      return fail(`請求データの見出しが見つかりません: ${missing.join("・")}。見出しの名前が変わっていないか確かめてください`, 500);
    }
    const at = (r: string[] | undefined, key: ColumnKey) => r?.[header.indexOf(COLUMNS[key])] ?? "";

    // 上から見て、発行日・取引先名・案件名・入力金額がどれも空の最初の行に書く（「まとめる」などほかの列は見ない）
    const isEmpty = (r: string[]) => (["issued", "client", "name", "amount"] as const).every((k) => at(r, k) === "");
    let index = values.findIndex(isEmpty);
    if (index === -1) index = values.length;
    const row = index + 2;
    const honorific = at(values[index], "honorific") || "御中"; // 敬称は前から入っているもの（なければ御中）

    // シートの行が足りないときは、下に20行足す
    const meta = await sheetsRequest<SheetMeta>(spreadsheetId, "?fields=sheets.properties(sheetId,gridProperties.rowCount)");
    const rowCount = meta.sheets.find((s) => s.properties.sheetId === SHEET_ID)?.properties.gridProperties.rowCount ?? 0;
    if (row > rowCount) {
      await sheetsRequest(spreadsheetId, ":batchUpdate", {
        method: "POST",
        body: JSON.stringify({ requests: [{ appendDimension: { sheetId: SHEET_ID, dimension: "ROWS", length: 20 } }] }),
      });
    }

    // 書くのは下の列だけ。入金日・送付・PDFリンク・備考・まとめる はスプレッドシートで使うので触らない
    // 日付は "YYYY-MM-DD" で送ると、スプレッドシートが日付として読む
    const f = formulas(row, letters);
    const cells: Record<ColumnKey, string | number> = {
      number: f.number,
      issued: today,
      workDate: p.delivered ?? "",
      client: p.company!,
      honorific,
      name: p.name,
      amount: p.price,
      taxType: "税込",
      subtotal: f.subtotal,
      tax: f.tax,
      total: f.total,
      dueDate: p.payDue ?? "",
      perMinute: p.perMinute ?? "",
      minutes: p.minutes ?? "",
      endClient: usesClient ? p.client! : "",
      videoType: usesVideoType ? videoType : "",
    };
    await sheetsRequest(spreadsheetId, "/values:batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: (Object.keys(cells) as ColumnKey[]).map((key) => ({
          range: `${SHEET}!${letters[key]}${row}`,
          values: [[cells[key]]],
        })),
      }),
    });

    // 書いた行を選んだ状態で開く URL（そのままメニューから PDF を発行できる）
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${SHEET_ID}&range=${letters.number}${row}`;
    return Response.json({ row, url });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "スプレッドシートに書き込めませんでした", 502);
  }
}
