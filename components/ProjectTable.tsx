import { useState, type ReactNode } from "react";
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

// 表の中でその場で変えられる日付の列
export type DateKey = "start" | "roughDue" | "due" | "billed" | "payDue" | "paid" | "delivered";

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
  payDue: "入金予定日",
  paid: "入金日",
  delivered: "納品日",
};

// 日付をその場で選ぶ欄。打ちかけで何度も保存しないよう、欄から離れたとき（または Enter）に保存する
function DateCell({ value, label, onChange, className }: {
  value: string | null;
  label: string;
  onChange: (value: string | null) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [prev, setPrev] = useState(value);
  // 状態を変えて日付が入ったときなど、外から変わったら入れ直す
  if (prev !== value) {
    setPrev(value);
    setDraft(value ?? "");
  }
  function commit() {
    const next = draft === "" ? null : draft;
    if (next !== value) onChange(next);
  }
  return (
    <input
      type="date"
      className={`date-input${className ? ` ${className}` : ""}`}
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
    />
  );
}

export default function ProjectTable({ projects, onStatusChange, onDateChange, onInvoice, onEdit, onDelete }: {
  projects: Project[];
  onStatusChange: (id: string, status: Status) => void;
  onDateChange: (id: string, key: DateKey, value: string | null) => void;
  onInvoice?: (project: Project) => void; // 自分用だけ渡す
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  // 日付のマス。変えるとすぐ保存する
  function date(p: Project, key: DateKey, className?: string) {
    return (
      <DateCell
        value={p[key]}
        label={`${p.name}の${HEADERS[key]}`}
        onChange={(v) => onDateChange(p.id, key, v)}
        className={className}
      />
    );
  }

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
      case "due": {
        const overdue = isOverdue(p, TODAY);
        return (
          <>
            {overdue && <span className="cell-note overdue-note">過ぎています</span>}
            {date(p, "due", overdue ? "overdue" : undefined)}
          </>
        );
      }
      case "billed":
        return (
          <>
            {p.billed == null && <span className="cell-note">未請求</span>}
            {date(p, "billed")}
          </>
        );
      case "start": case "roughDue": case "payDue": case "paid": case "delivered":
        return date(p, column);
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
