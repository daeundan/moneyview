"use client";
import { Icon } from "./icons";
import { cx } from "@/lib/format";

export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("mv_theme2", dark ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={toggle} aria-label="테마 전환" title="테마 전환"
      className={cx("inline-grid size-10 place-items-center rounded-xl text-ink-2 transition hover:bg-surface-2 hover:text-ink active:scale-95", className)}>
      <Icon name="moon" className="size-5 dark:hidden" />
      <Icon name="sun" className="hidden size-5 dark:block" />
    </button>
  );
}
