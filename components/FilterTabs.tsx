import type { Filter } from "@/lib/projects";

const TABS = [
  { kind: "all", label: "すべて" },
  { kind: "week", label: "今週提出" },
  { kind: "unpaid", label: "未入金" },
] as const;

// 絞り込みのタブと担当Dのプルダウン。選んでいるものは背景色（active）で区別する
export default function FilterTabs({ filter, directors, onChange }: {
  filter: Filter;
  directors: string[];
  onChange: (filter: Filter) => void;
}) {
  const director = filter.kind === "director" ? filter.name : "";

  return (
    <div className="tabs">
      {TABS.map((t) => (
        <button
          key={t.kind}
          type="button"
          className={`tab${filter.kind === t.kind ? " active" : ""}`}
          aria-pressed={filter.kind === t.kind}
          onClick={() => onChange({ kind: t.kind })}
        >
          {t.label}
        </button>
      ))}
      <select
        className={`tab-select${filter.kind === "director" ? " active" : ""}`}
        aria-label="担当Dで絞り込む"
        value={director}
        onChange={(e) => onChange(e.target.value ? { kind: "director", name: e.target.value } : { kind: "all" })}
      >
        <option value="">担当Dごと</option>
        {directors.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  );
}
