// 「請求書を発行」の入り口（自分用だけ）。中身は app/api/invoice/route.ts
// 請求書のスプレッドシートに1行書き込み、その行を開く URL を返す
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
