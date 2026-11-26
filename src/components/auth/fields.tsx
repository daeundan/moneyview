"use client";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { cx } from "@/lib/format";
import { Icon } from "@/components/ui/icons";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  ok?: string | null;
  hint?: string;
  addon?: React.ReactNode;
};

export const Field = forwardRef<HTMLInputElement, Props>(function Field({ label, error, ok, hint, addon, className, type, id, ...rest }, ref) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div className="mb-4 flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">{label}</label>
      <div className="relative flex gap-2">
        <input
          ref={ref}
          id={id}
          type={isPw && show ? "text" : type}
          aria-invalid={!!error}
          className={cx(
            "h-[52px] w-full flex-1 rounded-xl border bg-surface px-4 text-[16px] outline-none transition placeholder:text-ink-3",
            "focus:border-ink focus:shadow-[0_0_0_4px_rgba(15,17,21,.08)] dark:focus:shadow-[0_0_0_4px_rgba(255,255,255,.08)]",
            error ? "border-up" : "border-line",
            isPw && "pr-12",
            className,
          )}
          {...rest}
        />
        {isPw && (
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
            className="absolute top-1.5 right-1.5 inline-grid size-10 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink">
            <Icon name={show ? "eyeOff" : "eye"} />
          </button>
        )}
        {addon}
      </div>
      {error ? (
        <span className="animate-fade text-[12.5px] text-up">{error}</span>
      ) : ok ? (
        <span className="flex animate-fade items-center gap-1 text-[12.5px] text-emerald-600 dark:text-emerald-400"><Icon name="check" className="size-3.5" />{ok}</span>
      ) : hint ? (
        <span className="text-[12.5px] text-ink-3">{hint}</span>
      ) : null}
    </div>
  );
});

export function Check({ checked, onChange, children, strong }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; strong?: boolean }) {
  return (
    <label className={cx("flex flex-1 cursor-pointer items-center gap-3 py-2.5 text-[15px] select-none", strong && "font-bold")}>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={cx("grid size-[22px] shrink-0 place-items-center rounded-[7px] border-[1.5px] transition peer-focus-visible:shadow-[0_0_0_4px_rgba(15,17,21,.12)]",
        checked ? "border-ink bg-ink text-bg" : "border-line text-transparent")}>
        <Icon name="check" className="size-3.5" strokeWidth={3} />
      </span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}

export const btn = {
  primary: "inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-ink text-[16px] font-semibold text-bg transition hover:shadow-[0_10px_24px_-10px_rgba(0,0,0,.45)] active:scale-[.98] disabled:opacity-35 disabled:shadow-none disabled:active:scale-100",
  outline: "inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] border border-line bg-surface text-[16px] font-semibold transition hover:border-ink-3 active:scale-[.98]",
  ghost: "inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-surface-2 text-[16px] font-semibold transition hover:bg-line active:scale-[.98]",
};

export function Spinner() {
  return <span className="size-[18px] animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" />;
}
