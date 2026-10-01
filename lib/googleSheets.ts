// Google スプレッドシートを読み書きする（サーバーの中だけで使う。鍵をブラウザに出さない）
// 鍵はサービスアカウント（sheet-writer）。secrets/sheet-writer.json に置く（.gitignore 済み）
import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const KEY_FILE = path.join(process.cwd(), "secrets", "sheet-writer.json");

type ServiceAccountKey = { client_email: string; private_key: string; token_uri: string };

const base64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

// 鍵で署名した書類を Google に渡して、1時間使える通行証（アクセストークン）をもらう
async function getAccessToken(): Promise<string> {
  const raw = await readFile(KEY_FILE, "utf8").catch(() => {
    throw new Error("鍵のファイル secrets/sheet-writer.json がありません");
  });
  const key: ServiceAccountKey = JSON.parse(raw);

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: key.token_uri,
    iat: now,
    exp: now + 3600,
  }));
  const signature = createSign("RSA-SHA256").update(`${header}.${claim}`).sign(key.private_key);
  const jwt = `${header}.${claim}.${base64url(signature)}`;

  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!res.ok) throw new Error("Google にログインできませんでした");
  return (await res.json()).access_token;
}

// Sheets API を呼ぶ。失敗したら Google からの理由をそのまま投げる
export async function sheetsRequest<T>(spreadsheetId: string, apiPath: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}${apiPath}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `スプレッドシートの操作に失敗しました（${res.status}）`);
  }
  return res.json();
}
