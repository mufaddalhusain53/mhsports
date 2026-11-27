"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function ViewerSelect<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ left: false, above: false, maxHeight: 240 });
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function showMenu() {
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const below = window.innerHeight - bounds.bottom - 82;
    const above = below < 120 && bounds.top > below;
    setPlacement({
      left: bounds.right < 176,
      above,
      maxHeight: Math.min(240, Math.max(60, (above ? bounds.top : below) - 8)),
    });
    setOpen(true);
  }

  function focusOption(key: string) {
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? []);
    if (!buttons.length) return;
    const activeIndex = buttons.findIndex((button) => button === document.activeElement);
    const selectedIndex = buttons.findIndex((button) => button.getAttribute("aria-checked") === "true");
    const index = key === "Home" ? 0 : key === "End" ? buttons.length - 1
      : activeIndex < 0 ? Math.max(selectedIndex, 0)
      : (activeIndex + (key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[index].focus();
  }

  return <div ref={containerRef} className="relative" onBlur={(event) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={(event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const key = event.key;
      if (!open) {
        showMenu();
        window.requestAnimationFrame(() => focusOption(key));
      } else {
        focusOption(key);
      }
    }
  }}>
    <button ref={triggerRef} type="button" aria-label={`${label}: ${selectedLabel}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => open ? setOpen(false) : showMenu()} className="flex cursor-pointer items-center gap-2 rounded-full bg-slate-950/45 px-3 py-2 text-[10px] font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 sm:text-xs">
      <span className="max-w-28 truncate">{selectedLabel}</span>
      <span aria-hidden="true" className={`text-yellow-300 transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
    </button>
    {open && <div ref={menuRef} id={menuId} role="menu" aria-label={label} style={{ maxHeight: placement.maxHeight }} className={`absolute z-30 w-40 overflow-y-auto rounded-xl border border-white/20 bg-blue-950 p-1.5 shadow-xl ${placement.left ? "left-0" : "right-0"} ${placement.above ? "bottom-full mb-2" : "top-full mt-2"}`}>
      {options.map((option) => <button key={option.value} type="button" role="menuitemradio" aria-checked={value === option.value} tabIndex={value === option.value ? 0 : -1} onClick={() => {
          onChange(option.value);
          setOpen(false);
          triggerRef.current?.focus();
        }} className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-yellow-400 ${value === option.value ? "bg-yellow-400 text-slate-950" : "text-white hover:bg-white/10"}`}>
        <span className="min-w-0 break-words">{option.label}</span>
        {value === option.value && <span aria-hidden="true">✓</span>}
      </button>)}
    </div>}
  </div>;
}
