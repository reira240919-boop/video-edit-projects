import ProjectBoard from "@/components/ProjectBoard";
import { IS_MINE } from "@/lib/mode";

export default function Home() {
  return (
    <div className="wrap">
      <h1>
        動画編集 案件一覧
        {/* どちらの画面を開いているか分かるように、自分用だけ印を付ける */}
        {IS_MINE && <span className="mine-badge">自分用</span>}
      </h1>
      <ProjectBoard />
    </div>
  );
}
