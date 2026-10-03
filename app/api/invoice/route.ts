// 「請求書を発行」: 案件1件を、請求書のスプレッドシート（「請求データ」シート）の空いている行に書き込む
// PDF はこれまでどおり、スプレッドシートのメニュー「請求書 → 選択した行のPDFを発行」で作る
// GET: 取引先マスタの「取引内容」に {分単価} を使っている会社の一覧（入力欄で分単価の欄を最初から出すため）
// 自分用のときだけ動く。公開 URL では 404 を返す
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Project } from "@/data/sampleProjects";
import { sheetsRequest } from "@/lib/googleSheets";

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

// その行の計算式（請求書番号・税抜・消費税・税込）。スプレッドシートに前から入っているものと同じ
function formulas(row: number) {
  return {
    A: `=IF(B${row}="","","INV-"&TEXT(B${row},"yyyymm")&"-"&TEXT(ROW()-1,"000"))`,
    I: `=IF($G${row}="","",IF($H${row}="税込",ROUND($G${row}/1.1,0),$G${row}))`,
    J: `=IF($G${row}="","",IF($H${row}="税込",$G${row}-I${row},ROUND(I${row}*0.1,0)))`,
    K: `=IF($G${row}="","",IF($H${row}="税込",$G${row},I${row}+J${row}))`,
  };
}

export async function GET() {
  if (!IS_MINE) return notFound();
  const spreadsheetId = process.env.INVOICE_SPREADSHEET_ID;
  if (!spreadsheetId) return fail(".env.local に INVOICE_SPREADSHEET_ID がありません", 500);
  try {
    const { values = [] } = await sheetsRequest<ValueRange>(
      spreadsheetId, `/values/${encodeURIComponent(`${MASTER_SHEET}!A1:Z`)}`,
    );
    const [header = [], ...rows] = values;
    const col = header.indexOf("取引内容");
    const perMinuteCompanies = col === -1 ? [] : rows
      .filter((r) => (r[col] ?? "").includes("{分単価}") && r[0])
      .map((r) => r[0]);
    return Response.json({ perMinuteCompanies });
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
    // 上から見て、発行日・取引先名・案件名・入力金額がどれも空の最初の行に書く
    const { values = [] } = await sheetsRequest<ValueRange>(
      spreadsheetId, `/values/${encodeURIComponent(`${SHEET}!A2:G`)}`,
    );
    const isEmpty = (r: string[] = []) => ![1, 3, 5, 6].some((i) => (r[i] ?? "") !== "");
    let index = values.findIndex((r) => isEmpty(r));
    if (index === -1) index = values.length;
    const row = index + 2;
    const honorific = values[index]?.[4] || "御中"; // 敬称は前から入っているもの（なければ御中）

    // シートの行が足りないときは、下に20行足す
    const meta = await sheetsRequest<SheetMeta>(spreadsheetId, "?fields=sheets.properties(sheetId,gridProperties.rowCount)");
    const rowCount = meta.sheets.find((s) => s.properties.sheetId === SHEET_ID)?.properties.gridProperties.rowCount ?? 0;
    if (row > rowCount) {
      await sheetsRequest(spreadsheetId, ":batchUpdate", {
        method: "POST",
        body: JSON.stringify({ requests: [{ appendDimension: { sheetId: SHEET_ID, dimension: "ROWS", length: 20 } }] }),
      });
    }

    // A〜L 列と、R 列（分単価）・S 列（分数）。日付は "YYYY-MM-DD" で送ると、スプレッドシートが日付として読む
    // M〜Q 列（入金日・送付・PDFリンク・備考）はスプレッドシートで使うので触らない
    const f = formulas(row);
    const mainValues = [
      f.A, today, p.delivered ?? "", p.company, honorific, p.name, p.price, "税込", f.I, f.J, f.K, p.payDue ?? "",
    ];
    await sheetsRequest(spreadsheetId, "/values:batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: [
          { range: `${SHEET}!A${row}:L${row}`, values: [mainValues] },
          { range: `${SHEET}!R${row}:S${row}`, values: [[p.perMinute ?? "", p.minutes ?? ""]] },
        ],
      }),
    });

    // 書いた行を選んだ状態で開く URL（そのままメニューから PDF を発行できる）
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${SHEET_ID}&range=A${row}`;
    return Response.json({ row, url });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "スプレッドシートに書き込めませんでした", 502);
  }
}
