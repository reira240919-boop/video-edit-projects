"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

const MENU_HEIGHT = 84; // メニューのおおよその高さ（画面の下に入りきらないときは上に出す）

// 行の「⋯」ボタン。押すと「編集」「削除」のメニューを出す
export default function RowMenu({ label, onEdit, onDelete }: {
  label: string; // 読み上げ用（例: 「対談動画」の操作）
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos != null;

  function toggle() {
    if (open) return setPos(null);
    const r = buttonRef.current!.getBoundingClientRect();
    const below = r.bottom + 4 + MENU_HEIGHT <= window.innerHeight;
    setPos({ top: below ? r.bottom + 4 : r.top - 4 - MENU_HEIGHT, left: r.left });
  }

  function close(returnFocus = false) {
    setPos(null);
    if (returnFocus) buttonRef.current?.focus();
  }

  // 開いている間: 外を押す・Esc・スクロールで閉じる
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector("button")?.focus();
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onScroll = () => setPos(null);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`icon-btn${open ? " is-open" : ""}`}
        title="編集・削除"
        aria-label={`${label}の操作`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <DotsIcon />
      </button>
      {/* 表の外（ページの一番上の層）に出して、表の枠で切れないようにする */}
      {open && createPortal(
        <div ref={menuRef} className="row-menu" role="menu" style={{ top: pos.top, left: pos.left }}>
          <button type="button" role="menuitem" onClick={() => { close(); onEdit(); }}>
            <PencilIcon />編集
          </button>
          <button type="button" role="menuitem" className="danger" onClick={() => { close(); onDelete(); }}>
            <TrashIcon />削除
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
