import type { ReactNode } from "react";
import { STATUSES, type Project, type Status } from "@/data/sampleProjects";
import { IS_MINE, TODAY } from "@/lib/mode";
import { isOverdue, yen } from "@/lib/projects";
import RowMenu from "@/components/RowMenu";

type Column =
  | "name" | "director" | "type" | "kind" | "status" | "start" | "roughDue" | "due"
  | "price" | "billed" | "payDue" | "paid" | "delivered";

// 列の並び。自分用だけ、状態を区分の右に寄せて粗編提出日を足す（見本は前の並びのまま）
const COLUMNS: Column[] = IS_MINE
  ? ["name", "director", "type", "kind", "status", "start", "roughDue", "due", "price", "billed", "payDue", "paid", "delivered"]
  : ["name", "director", "type", "kind", "start", "status", "due", "price", "billed", "payDue", "paid", "delivered"];

const HEADERS: Record<Column, string> = {
  name: "会社名 / 案件名",
  director: "担当D",
  type: "種類",
  kind: "区分",
  status: "状態",
  start: "着手日",
  roughDue: "粗編提出日",
  due: IS_MINE ? "初稿提出日" : "提出予定日",
  price: "単価",
  billed: "請求日",
  payDue: "支払予定日",
  paid: "入金日",
  delivered: "納品日",
};

export default function ProjectTable({ projects, onStatusChange, onInvoice, onEdit, onDelete }: {
  projects: Project[];
  onStatusChange: (id: string, status: Status) => void;
  onInvoice?: (project: Project) => void; // 自分用だけ渡す
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  // 1つのマスの中身
  function cell(p: Project, column: Column): ReactNode {
    switch (column) {
      case "name":
        return (
          <>
            {p.company && <span className="company">{p.company}</span>}
            <strong>{p.name}</strong>
          </>
        );
      case "director": return p.director;
      case "type": return p.type;
      case "kind": return p.kind;
      case "status":
        // 状態はその場で選ぶ。選ぶとすぐ保存する
        return (
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
        );
      case "start": return p.start ?? "-";
      case "roughDue": return p.roughDue ?? "-";
      case "due":
        return p.due == null ? "-"
          : isOverdue(p, TODAY) ? <span className="overdue">{p.due}（過ぎています）</span>
          : p.due;
      case "price":
        return (
          <>
            {/* 分単価で計算した案件は、単価の上に「600円×16分」と小さく出す */}
            {p.perMinute != null && p.minutes != null && (
              <span className="cell-note">{yen(p.perMinute)}×{p.minutes}分</span>
            )}
            {p.price != null ? yen(p.price) : "-"}
          </>
        );
      case "billed": return p.billed ?? "未請求";
      case "payDue": return p.payDue ?? "-";
      case "paid": return p.paid ?? "-";
      case "delivered": return p.delivered ?? "-";
    }
  }

  return (
    // 横1行の表。狭い画面では横にスクロールする
    <div className="table-wrap">
      <table className={IS_MINE ? "mine-layout" : undefined}>
        <thead>
          <tr>
            <th className="actions"><span className="visually-hidden">操作</span></th>
            {COLUMNS.map((c) => (
              <th key={c}>{HEADERS[c]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td className="actions">
                <RowMenu
                  label={p.name}
                  // 請求書を発行できるのは納品済みだけ
                  onInvoice={onInvoice && p.status === "納品済み" ? () => onInvoice(p) : undefined}
                  onEdit={() => onEdit(p)}
                  onDelete={() => onDelete(p)}
                />
              </td>
              {COLUMNS.map((c) => (
                <td key={c}>{cell(p, c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
