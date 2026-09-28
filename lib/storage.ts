// 案件の読み込みと保存の入り口（画面の部品はここだけを使う）
// 公開する見本: 開いた人のブラウザの中（localStorage）に保存する
// 自分用（パソコン内のファイル）は、あとの手順でここに足す
import { sampleProjects, type Project } from "@/data/sampleProjects";

const STORAGE_KEY = "video-edit-projects:sample:v1";

// 保存がないときや、読めなかったときは最初の6件
function initialProjects(): Project[] {
  return sampleProjects.map((p) => ({ ...p }));
}

export async function loadProjects(): Promise<Project[]> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: unknown = JSON.parse(raw);
      if (Array.isArray(data)) return data as Project[];
    }
  } catch {
    // プライベートウィンドウなどで読めないときは、最初の6件で表示する
  }
  return initialProjects();
}

// 見本を最初の6件に戻す（ブラウザの中の保存を消す）
export async function resetProjects(): Promise<Project[]> {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 消せなくても、画面は最初の6件で表示する
  }
  return initialProjects();
}

export async function saveProjects(projects: Project[]): Promise<void> {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    throw new Error("このブラウザでは保存できませんでした");
  }
}
