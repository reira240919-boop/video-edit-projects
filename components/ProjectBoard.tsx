"use client";

import { useEffect, useRef, useState } from "react";
import type { Project, Status } from "@/data/sampleProjects";
import { IS_MINE, TODAY } from "@/lib/mode";
import { applyStatus, companyNames, directorNames, filterProjects, sortByDue, type Filter } from "@/lib/projects";
import { loadPerMinuteCompanies, writeInvoiceRow } from "@/lib/invoice";
import { loadProjects, resetProjects, saveProjects } from "@/lib/storage";
import FilterTabs from "@/components/FilterTabs";
import ProjectForm from "@/components/ProjectForm";
import ProjectTable from "@/components/ProjectTable";
import SummaryBoxes from "@/components/SummaryBoxes";

type Toast = { text: string; error?: boolean };
// 入力欄: 閉じている / 追加 / 修正（どの案件か）
type FormState = null | { mode: "add" } | { mode: "edit"; project: Project };

// 画面全体。案件のデータと、選んでいる絞り込みをここで覚える
export default function ProjectBoard() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [toast, setToast] = useState<Toast | null>(null);
  const [form, setForm] = useState<FormState>(null);
  // 分単価で計算する会社（自分用だけ。請求書のスプレッドシートの取引先マスタから読む）
  const [perMinuteCompanies, setPerMinuteCompanies] = useState<string[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 保存先から読み込む（ブラウザの中にしかないので、開いたあとに読む）
  useEffect(() => {
    loadProjects()
      .then(setProjects)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "読み込めませんでした"));
    if (IS_MINE) loadPerMinuteCompanies().then(setPerMinuteCompanies);
  }, []);

  // 「保存しました」などを数秒だけ出す
  function showToast(t: Toast) {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  // 変更を画面に反映して、保存先にも書く
  async function update(next: Project[], message = "保存しました") {
    setProjects(next);
    try {
      await saveProjects(next);
      showToast({ text: message });
    } catch (e) {
      showToast({ text: e instanceof Error ? e.message : "保存できませんでした", error: true });
    }
  }

  function changeStatus(id: string, status: Status) {
    if (!projects) return;
    update(projects.map((p) => (p.id === id ? applyStatus(p, status, TODAY) : p)));
  }

  // 入力欄の保存。追加なら足し、修正なら同じ id の案件を置きかえる
  function saveForm(project: Project) {
    if (!projects || !form) return;
    if (form.mode === "add") {
      update([...projects, project]);
      // 絞り込みで隠れないように「すべて」に戻す
      setFilter({ kind: "all" });
    } else {
      update(projects.map((p) => (p.id === project.id ? project : p)));
    }
    setForm(null);
  }

  // 請求書のスプレッドシートに1行書き込んで、その行を新しいタブで開く。書けたら請求日を今日にして「請求済み」にする
  async function issueInvoice(project: Project) {
    if (!projects) return;
    if (!project.company) {
      showToast({ text: "会社名が空です。「編集」で会社名を入れてください", error: true });
      return;
    }
    if (!window.confirm(`「${project.company}」の「${project.name}」を請求書のスプレッドシートに書き込みますか？`)) return;
    // 書き込みを待ってから開くとブラウザに止められるので、先にタブだけ開いておく
    const tab = window.open("", "_blank");
    try {
      const { row, url } = await writeInvoiceRow(project.id, TODAY);
      if (tab) tab.location.href = url;
      else window.open(url, "_blank");
      update(
        projects.map((p) => (p.id === project.id ? applyStatus(p, "請求済み", TODAY) : p)),
        `請求データの${row}行目に書き込みました`,
      );
    } catch (e) {
      tab?.close();
      showToast({ text: e instanceof Error ? e.message : "スプレッドシートに書き込めませんでした", error: true });
    }
  }

  function deleteProject(project: Project) {
    if (!projects) return;
    if (!window.confirm(`「${project.name}」を削除しますか？\nこの操作は取り消せません。`)) return;
    update(projects.filter((p) => p.id !== project.id), "削除しました");
    // 修正中の案件を消したときは入力欄も閉じる
    if (form?.mode === "edit" && form.project.id === project.id) setForm(null);
  }

  // 見本を最初の6件に戻す（確認してから）
  async function reset() {
    if (!window.confirm("入力した内容は消えて、最初の6件に戻ります。よろしいですか？")) return;
    setProjects(await resetProjects());
    setForm(null);
    setFilter({ kind: "all" });
    showToast({ text: "最初の6件に戻しました" });
  }

  if (loadError) {
    return <p className="empty load-error">{loadError}。画面を開き直してください。</p>;
  }

  if (projects == null) {
    return <p className="loading">読み込み中…</p>;
  }

  // 絞り込みは2つの表の両方にかける（上の数字は全件から計算する）
  const list = filterProjects(projects, filter, TODAY);
  const active = list.filter((p) => p.status !== "見送り");
  const skipped = list.filter((p) => p.status === "見送り");
  const tableHandlers = {
    onStatusChange: changeStatus,
    // 請求書を発行は自分用だけ（見本では出さない）
    onInvoice: IS_MINE ? issueInvoice : undefined,
    onEdit: (project: Project) => setForm({ mode: "edit", project }),
    onDelete: deleteProject,
  } as const;

  return (
    <>
      <SummaryBoxes projects={projects} today={TODAY} />
      <div className="toolbar">
        <FilterTabs filter={filter} directors={directorNames(projects)} onChange={setFilter} />
        <div className="toolbar-actions">
          {/* 見本だけ。自分用で押すと本物の記録が消えるので出さない */}
          {!IS_MINE && (
            <button type="button" className="btn-secondary" onClick={reset}>
              最初の6件に戻す
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => setForm({ mode: "add" })} disabled={form?.mode === "add"}>
            ＋ 案件を追加
          </button>
        </div>
      </div>
      {form && (
        <ProjectForm
          // 別の案件の修正に切りかえたとき、中身を入れ直す
          key={form.mode === "edit" ? form.project.id : "new"}
          initial={form.mode === "edit" ? form.project : undefined}
          companies={companyNames(projects)}
          perMinuteCompanies={perMinuteCompanies}
          directors={directorNames(projects)}
          onSave={saveForm}
          onCancel={() => setForm(null)}
        />
      )}
      {active.length === 0
        ? <div className="empty">該当する案件はありません</div>
        : <ProjectTable projects={sortByDue(active)} {...tableHandlers} />}
      {/* 見送りは本体の表とは分けて、下に別の表で出す */}
      {skipped.length > 0 && (
        <section className="sub-section">
          <h2>見送り</h2>
          <ProjectTable projects={skipped} {...tableHandlers} />
        </section>
      )}
      <div className={`toast${toast?.error ? " toast-error" : ""}`} role="status" aria-live="polite" hidden={!toast}>
        {toast?.text}
      </div>
    </>
  );
}
