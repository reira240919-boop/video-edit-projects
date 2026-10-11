"use client";

import { useState, type FormEvent } from "react";
import { STATUSES, type Project, type Status } from "@/data/sampleProjects";
import { IS_MINE } from "@/lib/mode";
import { perMinuteTotal, sameCompany } from "@/lib/projects";

// 入力欄の中身（どれも文字で持ち、保存するときに案件の形に直す）
type Values = {
  company: string;
  client: string;
  name: string;
  director: string;
  type: Project["type"];
  kind: Project["kind"];
  start: string;
  roughDue: string;
  status: Status;
  due: string;
  price: string;
  perMinute: string;
  minutes: string;
  billed: string;
  payDue: string;
  paid: string;
  delivered: string;
};

const EMPTY: Values = {
  company: "", client: "", name: "", director: "", type: "ショート", kind: "新規", start: "", roughDue: "", status: "相談中",
  due: "", price: "", perMinute: "", minutes: "", billed: "", payDue: "", paid: "", delivered: "",
};

function toValues(p: Project): Values {
  return {
    company: p.company ?? "", client: p.client ?? "", name: p.name, director: p.director, type: p.type, kind: p.kind, start: p.start ?? "",
    roughDue: p.roughDue ?? "",
    status: p.status, due: p.due ?? "", price: p.price != null ? String(p.price) : "",
    perMinute: p.perMinute != null ? String(p.perMinute) : "", minutes: p.minutes != null ? String(p.minutes) : "",
    billed: p.billed ?? "", payDue: p.payDue ?? "", paid: p.paid ?? "", delivered: p.delivered ?? "",
  };
}

// "15,000" や "15000円" も数字として読む。読めなければ NaN
function parsePrice(s: string): number | null {
  const t = s.replace(/[,，円\s]/g, "");
  if (t === "") return null;
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

// 分数は "16" や "1.5" を読む。読めなければ NaN
function parseMinutes(s: string): number | null {
  const t = s.replace(/[分\s]/g, "");
  if (t === "") return null;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

// 分単価と分数がどちらも数字なら、その掛け算。そうでなければ null（単価は手で入れる）
function computedPrice(v: Values): number | null {
  const pm = parsePrice(v.perMinute);
  const min = parseMinutes(v.minutes);
  if (pm == null || min == null || Number.isNaN(pm) || Number.isNaN(min)) return null;
  return perMinuteTotal(pm, min);
}

type Errors = Partial<Record<"name" | "director" | "price" | "perMinute" | "minutes", string>>;

function validate(v: Values, usePerMinute: boolean): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = "案件名を入れてください";
  if (!v.director.trim()) errors.director = "担当Dを入れてください";
  if (Number.isNaN(parsePrice(v.price))) errors.price = "単価は数字で入れてください";
  if (usePerMinute) {
    const pm = parsePrice(v.perMinute);
    const min = parseMinutes(v.minutes);
    if (Number.isNaN(pm)) errors.perMinute = "分単価は数字で入れてください";
    if (Number.isNaN(min)) errors.minutes = "分数は数字で入れてください";
    // 片方だけでは単価を計算できない
    if (pm != null && min == null) errors.minutes = "分数も入れてください";
    if (pm == null && min != null) errors.perMinute = "分単価も入れてください";
  }
  return errors;
}

// 追加・修正の入力欄。initial があれば修正（中身入りで開く）
// perMinuteCompanies: 請求書の取引内容に {分単価} を使う会社（この会社なら分単価の欄を最初から出す）
export default function ProjectForm({
  initial, companies, clients, perMinuteCompanies, directors, onSave, onCancel,
}: {
  initial?: Project;
  companies: string[];
  clients: string[];
  perMinuteCompanies: string[];
  directors: string[];
  onSave: (project: Project) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Values>(initial ? toValues(initial) : EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  // 分単価の欄: 「＋ 分単価で計算」で開いた / 「分単価を使わない」で閉じた
  const [perMinuteOpen, setPerMinuteOpen] = useState(initial?.perMinute != null || initial?.minutes != null);
  const [perMinuteClosed, setPerMinuteClosed] = useState(false);
  const isPerMinuteCompany = perMinuteCompanies.some((c) => sameCompany(c, values.company));
  const usePerMinute = perMinuteOpen || (isPerMinuteCompany && !perMinuteClosed);
  const autoPrice = usePerMinute ? computedPrice(values) : null;

  function closePerMinute() {
    setPerMinuteOpen(false);
    setPerMinuteClosed(true);
    setValues((v) => ({ ...v, perMinute: "", minutes: "" }));
    setErrors((e) => ({ ...e, perMinute: undefined, minutes: undefined }));
  }

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validate(values, usePerMinute);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      // 最初に直すところへ移動する
      const first = Object.keys(found)[0];
      e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const date = (s: string) => (s === "" ? null : s);
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      company: values.company.trim() || null,
      client: IS_MINE ? values.client.trim() || null : null,
      name: values.name.trim(),
      director: values.director.trim(),
      type: values.type,
      kind: values.kind,
      start: date(values.start),
      roughDue: date(values.roughDue),
      status: values.status,
      due: date(values.due),
      // 分単価と分数があれば、単価はその掛け算
      price: autoPrice ?? parsePrice(values.price),
      perMinute: usePerMinute ? parsePrice(values.perMinute) : null,
      minutes: usePerMinute ? parseMinutes(values.minutes) : null,
      billed: date(values.billed),
      payDue: date(values.payDue),
      paid: date(values.paid),
      delivered: date(values.delivered),
      next: initial?.next ?? "",
    });
  }

  const dateField = (key: "start" | "roughDue" | "due" | "billed" | "payDue" | "paid" | "delivered", label: string, width = "") => (
    <label className={`field ${width}`.trim()}>
      <span>{label}</span>
      <input type="date" name={key} value={values[key]} onChange={(e) => set(key, e.target.value)} />
    </label>
  );

  return (
    <form className={IS_MINE ? "project-form mine-form" : "project-form"} onSubmit={handleSubmit} noValidate>
      <h2>{initial ? "案件を修正" : "案件を追加"}</h2>
      <div className="form-grid">
        <label className="field">
          <span>会社名</span>
          <input
            name="company" value={values.company} list="company-list" autoFocus
            onChange={(e) => set("company", e.target.value)}
          />
          {/* 入れたことのある会社名を候補に出す */}
          <datalist id="company-list">
            {companies.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        {/* クライアント名は自分用だけ（請求書の取引内容で使う会社のため） */}
        {IS_MINE && (
          <label className="field">
            <span>クライアント名</span>
            <input
              name="client" value={values.client} list="client-list" placeholder="例: 〇〇株式会社"
              onChange={(e) => set("client", e.target.value)}
            />
            {/* 入れたことのあるクライアント名を候補に出す */}
            <datalist id="client-list">
              {clients.map((c) => <option key={c} value={c} />)}
            </datalist>
          </label>
        )}
        <label className="field">
          <span>案件名<em>必須</em></span>
          <input
            name="name" value={values.name}
            className={errors.name ? "invalid" : undefined} aria-invalid={!!errors.name}
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.name && <small className="field-error">{errors.name}</small>}
        </label>
        <label className="field">
          <span>担当D<em>必須</em></span>
          <input
            name="director" value={values.director} list="director-list"
            className={errors.director ? "invalid" : undefined} aria-invalid={!!errors.director}
            onChange={(e) => set("director", e.target.value)}
          />
          {/* 入れたことのある担当Dを候補に出す */}
          <datalist id="director-list">
            {directors.map((d) => <option key={d} value={d} />)}
          </datalist>
          {errors.director && <small className="field-error">{errors.director}</small>}
        </label>
        <label className="field">
          <span>種類</span>
          <select name="type" value={values.type} onChange={(e) => set("type", e.target.value as Values["type"])}>
            <option value="ショート">ショート</option>
            <option value="ロング">ロング</option>
          </select>
        </label>
        <label className="field">
          <span>区分</span>
          <select name="kind" value={values.kind} onChange={(e) => set("kind", e.target.value as Values["kind"])}>
            <option value="新規">新規</option>
            <option value="継続">継続</option>
          </select>
        </label>
        {/* 表と同じ順番。自分用は 状態 → 着手日 → 粗編提出日 → 初稿提出日、見本は 着手日 → 状態 → 提出予定日 */}
        {!IS_MINE && dateField("start", "着手日")}
        <label className="field">
          <span>状態<em>必須</em></span>
          <select name="status" value={values.status} onChange={(e) => set("status", e.target.value as Status)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {IS_MINE && dateField("start", "着手日")}
        {IS_MINE && dateField("roughDue", "粗編提出日")}
        {dateField("due", IS_MINE ? "初稿提出日" : "提出予定日")}
        <label className="field">
          <span>単価（円）</span>
          <input
            name="price" inputMode="numeric" placeholder="例: 15000"
            // 分単価と分数が入っていれば、掛け算の答えを出して手では変えられないようにする
            value={autoPrice != null ? String(autoPrice) : values.price} readOnly={autoPrice != null}
            className={errors.price ? "invalid" : undefined} aria-invalid={!!errors.price}
            onChange={(e) => set("price", e.target.value)}
          />
          {autoPrice != null && <small className="field-hint">分単価×分数で自動計算</small>}
          {errors.price && <small className="field-error">{errors.price}</small>}
          {usePerMinute
            ? <button type="button" className="link-btn" onClick={closePerMinute}>分単価を使わない</button>
            : <button type="button" className="link-btn" onClick={() => setPerMinuteOpen(true)}>＋ 分単価で計算</button>}
        </label>
        {usePerMinute && (
          <>
            <label className="field">
              <span>分単価（円）</span>
              <input
                name="perMinute" value={values.perMinute} inputMode="numeric" placeholder="例: 600"
                className={errors.perMinute ? "invalid" : undefined} aria-invalid={!!errors.perMinute}
                onChange={(e) => set("perMinute", e.target.value)}
              />
              {errors.perMinute && <small className="field-error">{errors.perMinute}</small>}
            </label>
            <label className="field">
              <span>分数（分）</span>
              <input
                name="minutes" value={values.minutes} inputMode="decimal" placeholder="例: 16"
                className={errors.minutes ? "invalid" : undefined} aria-invalid={!!errors.minutes}
                onChange={(e) => set("minutes", e.target.value)}
              />
              {errors.minutes && <small className="field-error">{errors.minutes}</small>}
            </label>
          </>
        )}
        {dateField("billed", "請求日")}
        {dateField("payDue", "入金予定日")}
        {dateField("paid", "入金日")}
        {dateField("delivered", "納品日")}
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-primary">保存</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>キャンセル</button>
      </div>
    </form>
  );
}
