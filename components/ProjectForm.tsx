"use client";

import { useState, type FormEvent } from "react";
import { STATUSES, type Project, type Status } from "@/data/sampleProjects";

// 入力欄の中身（どれも文字で持ち、保存するときに案件の形に直す）
type Values = {
  name: string;
  director: string;
  type: Project["type"];
  kind: Project["kind"];
  start: string;
  status: Status;
  due: string;
  price: string;
  billed: string;
  payDue: string;
  paid: string;
  delivered: string;
};

const EMPTY: Values = {
  name: "", director: "", type: "ショート", kind: "新規", start: "", status: "相談中",
  due: "", price: "", billed: "", payDue: "", paid: "", delivered: "",
};

function toValues(p: Project): Values {
  return {
    name: p.name, director: p.director, type: p.type, kind: p.kind, start: p.start ?? "",
    status: p.status, due: p.due ?? "", price: p.price != null ? String(p.price) : "",
    billed: p.billed ?? "", payDue: p.payDue ?? "", paid: p.paid ?? "", delivered: p.delivered ?? "",
  };
}

// "15,000" や "15000円" も数字として読む。読めなければ NaN
function parsePrice(s: string): number | null {
  const t = s.replace(/[,，円\s]/g, "");
  if (t === "") return null;
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

type Errors = Partial<Record<"name" | "director" | "price", string>>;

function validate(v: Values): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = "案件名を入れてください";
  if (!v.director.trim()) errors.director = "担当Dを入れてください";
  if (Number.isNaN(parsePrice(v.price))) errors.price = "単価は数字で入れてください";
  return errors;
}

// 追加・修正の入力欄。initial があれば修正（中身入りで開く）
export default function ProjectForm({ initial, directors, onSave, onCancel }: {
  initial?: Project;
  directors: string[];
  onSave: (project: Project) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Values>(initial ? toValues(initial) : EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validate(values);
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
      name: values.name.trim(),
      director: values.director.trim(),
      type: values.type,
      kind: values.kind,
      start: date(values.start),
      status: values.status,
      due: date(values.due),
      price: parsePrice(values.price),
      billed: date(values.billed),
      payDue: date(values.payDue),
      paid: date(values.paid),
      delivered: date(values.delivered),
      next: initial?.next ?? "",
    });
  }

  const dateField = (key: "start" | "due" | "billed" | "payDue" | "paid" | "delivered", label: string) => (
    <label className="field">
      <span>{label}</span>
      <input type="date" name={key} value={values[key]} onChange={(e) => set(key, e.target.value)} />
    </label>
  );

  return (
    <form className="project-form" onSubmit={handleSubmit} noValidate>
      <h2>{initial ? "案件を修正" : "案件を追加"}</h2>
      <div className="form-grid">
        <label className="field">
          <span>案件名<em>必須</em></span>
          <input
            name="name" value={values.name} autoFocus
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
            <option value="横動画">横動画</option>
          </select>
        </label>
        <label className="field">
          <span>区分</span>
          <select name="kind" value={values.kind} onChange={(e) => set("kind", e.target.value as Values["kind"])}>
            <option value="新規">新規</option>
            <option value="継続">継続</option>
          </select>
        </label>
        {dateField("start", "着手日")}
        <label className="field">
          <span>状態<em>必須</em></span>
          <select name="status" value={values.status} onChange={(e) => set("status", e.target.value as Status)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {dateField("due", "納品予定日")}
        <label className="field">
          <span>単価（円）</span>
          <input
            name="price" value={values.price} inputMode="numeric" placeholder="例: 15000"
            className={errors.price ? "invalid" : undefined} aria-invalid={!!errors.price}
            onChange={(e) => set("price", e.target.value)}
          />
          {errors.price && <small className="field-error">{errors.price}</small>}
        </label>
        {dateField("billed", "請求日")}
        {dateField("payDue", "支払予定日")}
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
