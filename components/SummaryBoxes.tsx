"use client";

import { useState } from "react";
import type { Project } from "@/data/sampleProjects";
import { countInProgress, monthLabel, salesMonths, salesOfMonth, sumUnpaid, yen } from "@/lib/projects";

// 上の数字（進行中の件数・納品済みで未入金・月ごとの売上）
// 絞り込みに関係なく、全件から計算する
export default function SummaryBoxes({ projects, today }: { projects: Project[]; today: string }) {
  const months = salesMonths(projects, today);
  const [month, setMonth] = useState(today.slice(0, 7)); // 最初は今月
  const sales = salesOfMonth(projects, month);

  return (
    <div className="summary">
      {/* 月のプルダウンは枠の外（売上の枠の上）に置き、枠の中の見出しと金額の高さをそろえる */}
      <label className="month-picker">
        売上の月
        <select className="month-select" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </label>
      <div className="summary-box">
        <div className="summary-label">進行中の件数（編集中・提出済み）</div>
        <div className="summary-value">{countInProgress(projects)}件</div>
      </div>
      <div className="summary-box">
        <div className="summary-label">納品済みで未入金</div>
        <div className="summary-value">{yen(sumUnpaid(projects))}</div>
      </div>
      <div className="summary-box sales-box">
        <div className="sales-values">
          <div>
            <div className="summary-label">入金済み</div>
            <div className="summary-value">{yen(sales.paid)}</div>
          </div>
          <div>
            <div className="summary-label">入金予定</div>
            <div className="summary-value">{yen(sales.planned)}</div>
          </div>
          <div>
            <div className="summary-label">合計</div>
            <div className="summary-value">{yen(sales.total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
