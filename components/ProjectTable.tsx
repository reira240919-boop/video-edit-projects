import { STATUSES, type Project, type Status } from "@/data/sampleProjects";
import { TODAY } from "@/lib/mode";
import { isOverdue, yen } from "@/lib/projects";
import RowMenu from "@/components/RowMenu";

const HEADERS = [
  "案件名", "担当D", "種類", "区分", "着手日", "状態", "提出予定日", "単価",
  "請求日", "支払予定日", "入金日", "納品日",
];

export default function ProjectTable({ projects, onStatusChange, onEdit, onDelete }: {
  projects: Project[];
  onStatusChange: (id: string, status: Status) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  return (
    // 横1行の表。狭い画面では横にスクロールする
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="actions"><span className="visually-hidden">操作</span></th>
            {HEADERS.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td className="actions">
                <RowMenu label={p.name} onEdit={() => onEdit(p)} onDelete={() => onDelete(p)} />
              </td>
              <td><strong>{p.name}</strong></td>
              <td>{p.director}</td>
              <td>{p.type}</td>
              <td>{p.kind}</td>
              <td>{p.start ?? "-"}</td>
              <td>
                {/* 状態はその場で選ぶ。選ぶとすぐ保存する */}
                <select
                  className={`status status-select st-${p.status}`}
                  aria-label={`${p.name}の状態`}
                  value={p.status}
                  onChange={(e) => onStatusChange(p.id, e.target.value as Status)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>
                {p.due == null ? "-"
                  : isOverdue(p, TODAY) ? <span className="overdue">{p.due}（過ぎています）</span>
                  : p.due}
              </td>
              <td>{p.price != null ? yen(p.price) : "-"}</td>
              <td>{p.billed ?? "未請求"}</td>
              <td>{p.payDue ?? "-"}</td>
              <td>{p.paid ?? "-"}</td>
              <td>{p.delivered ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
