// 自分用の保存先（パソコン内のファイル my-data/projects.json）を読み書きする
// 自分用（`npm run dev:mine`）のときだけ動く。公開 URL では 404 を返す
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const IS_MINE = process.env.NEXT_PUBLIC_DATA_MODE === "mine";
const DIR = path.join(process.cwd(), "my-data");
const FILE = path.join(DIR, "projects.json");

const notFound = () => new Response("Not Found", { status: 404 });

export async function GET() {
  if (!IS_MINE) return notFound();
  try {
    return Response.json(JSON.parse(await readFile(FILE, "utf8")));
  } catch (e) {
    // まだファイルがないときは空（最初は0件）
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return Response.json([]);
    return Response.json({ error: "ファイルを読めませんでした" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!IS_MINE) return notFound();
  const data: unknown = await request.json().catch(() => null);
  if (!Array.isArray(data)) {
    return Response.json({ error: "保存する内容の形が正しくありません" }, { status: 400 });
  }
  // 書きかけで止まってもファイルが壊れないよう、別名で書いてから置きかえる
  await mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, FILE);
  return Response.json({ ok: true });
}
