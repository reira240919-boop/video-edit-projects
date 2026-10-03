// 「請求書を発行」の入り口（自分用だけ）。中身は app/api/invoice/route.ts
// 請求書のスプレッドシートに1行書き込み、その行を開く URL を返す
// 請求書の取引内容に {分単価} を使う会社。読めなかったときは空（「＋ 分単価で計算」で開ける）
export async function loadPerMinuteCompanies(): Promise<string[]> {
  try {
    const res = await fetch("/api/invoice", { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()).perMinuteCompanies ?? [];
  } catch {
    return [];
  }
}

export async function writeInvoiceRow(id: string, today: string): Promise<{ row: number; url: string }> {
  const res = await fetch("/api/invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, today }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "スプレッドシートに書き込めませんでした");
  return data;
}
