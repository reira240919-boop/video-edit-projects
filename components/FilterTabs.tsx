import { ALL_MONTHS, monthLabel, usesMonth, type Filter } from "@/lib/projects";

const TABS = [
  { kind: "all", label: "すべて" },
  { kind: "week", label: "今週提出" },
  { kind: "unpaid", label: "未入金" },
] as const;

// 絞り込みのタブと担当Dのプルダウン。選んでいるものはメインの色で塗る（active）
// 着手月のプルダウンはほかの絞り込みと重ねてかける（いつも何かの月を選んでいるので背景色は付けない）
// 今週提出・未入金を選んでいる間は月をかけないので、押せないようにする
export default function FilterTabs({ filter, directors, onChange, month, months, onMonthChange }: {
  filter: Filter;
  directors: string[];
  onChange: (filter: Filter) => void;
  month: string;
  months: string[];
  onMonthChange: (month: string) => void;
}) {
  const director = filter.kind === "director" ? filter.name : "";
  const monthOn = usesMonth(filter);

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
      <select
        className="tab-select"
        aria-label="着手月で分ける"
        disabled={!monthOn}
        title={monthOn ? undefined : "今週提出・未入金は、すべての月から出します"}
        value={month}
        onChange={(e) => onMonthChange(e.target.value)}
      >
        {months.map((m) => (
          <option key={m} value={m}>{monthLabel(m)}着手</option>
        ))}
        <option value={ALL_MONTHS}>すべての月</option>
      </select>
    </div>
  );
}
