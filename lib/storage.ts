// 案件の読み込みと保存の入り口（画面の部品はここだけを使う）
// 公開する見本: 開いた人のブラウザの中（localStorage）に保存する
// 自分用: パソコン内のファイル my-data/projects.json に保存する（app/api/projects/route.ts 経由）
import { sampleProjects, type Project } from "@/data/sampleProjects";
import { IS_MINE } from "@/lib/mode";

const STORAGE_KEY = "video-edit-projects:sample:v1";
const API = "/api/projects";

// 保存がないときや、読めなかったときは最初の6件
function initialProjects(): Project[] {
  return sampleProjects.map((p) => ({ ...p }));
}

// 昔の呼び方で保存されたデータを今の呼び方に直す（「確認待ち」は「提出済み」に変えた）
function migrate(projects: Project[]): Project[] {
  return projects.map((p) => ((p.status as string) === "確認待ち" ? { ...p, status: "提出済み" } : p));
}

// 自分用で読めなかったときは、見本に切りかえず失敗として扱う（本物の記録と見本が混ざらないように）
export async function loadProjects(): Promise<Project[]> {
  if (IS_MINE) {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) throw new Error("my-data/projects.json を読めませんでした");
    return migrate(await res.json());
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: unknown = JSON.parse(raw);
      if (Array.isArray(data)) return migrate(data as Project[]);
    }
  } catch {
    // プライベートウィンドウなどで読めないときは、最初の6件で表示する
  }
  return initialProjects();
}

// 見本を最初の6件に戻す（ブラウザの中の保存を消す）。自分用では使わない
export async function resetProjects(): Promise<Project[]> {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 消せなくても、画面は最初の6件で表示する
  }
  return initialProjects();
}

export async function saveProjects(projects: Project[]): Promise<void> {
  if (IS_MINE) {
    const res = await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projects),
    });
    if (!res.ok) throw new Error("ファイルに保存できませんでした");
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    throw new Error("このブラウザでは保存できませんでした");
  }
}
