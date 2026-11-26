"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers";
import { Brand } from "@/components/ui/kit";
import { Icon } from "@/components/ui/icons";
import { formatPhone } from "@/lib/format";
import { btn, Check, Field, Spinner } from "./fields";

type Key = "name" | "phone" | "email" | "username" | "password" | "password2";

const TERMS = {
  privacy: {
    title: "개인정보 수집 · 이용 동의 (필수)",
    rows: [
      ["수집 항목", "이름, 전화번호, 이메일 주소, 아이디, 비밀번호"],
      ["수집 목적", "회원 식별 및 가입 의사 확인, 서비스 제공(맞춤 리포트·알림), 고객 문의 응대"],
      ["보유 기간", "회원 탈퇴 시까지 (관계 법령에 따라 보존이 필요한 경우 해당 기간까지)"],
    ],
    note: "위 동의를 거부할 수 있으나, 거부 시 회원가입 및 서비스 이용이 제한됩니다.",
  },
  marketing: {
    title: "제3자 마케팅 정보 수신 동의 (선택)",
    rows: [
      ["제공받는 자", "머니뷰 제휴 증권사 · 금융사"],
      ["제공 항목", "이름, 전화번호, 이메일 주소"],
      ["제공 목적", "금융 상품·이벤트 안내 등 마케팅 정보 발송 (SMS · 이메일)"],
      ["보유 기간", "동의 철회 또는 회원 탈퇴 시까지"],
    ],
    note: "동의하지 않아도 가입 및 서비스 이용에 제한이 없으며, 마이페이지에서 언제든 철회할 수 있습니다.",
  },
} as const;

export function SignupForm() {
  const { signup, isTaken, ready, user } = useAuth();
  const router = useRouter();
  const [v, setV] = useState<Record<Key, string>>({ name: "", phone: "", email: "", username: "", password: "", password2: "" });
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [agree, setAgree] = useState({ privacy: false, marketing: false });
  const [terms, setTerms] = useState<keyof typeof TERMS | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const signingUp = useRef(false);
  // 아이디 중복확인: 확인 버튼을 누른 아이디 (아이디를 고치면 다시 확인해야 함)
  const [checkedId, setCheckedId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (ready && user && !done && !signingUp.current) router.replace("/dashboard");
  }, [ready, user, done, router]);

  const errors = useMemo(() => {
    const uname = v.username.trim().toLowerCase();
    return {
      name: !/^[가-힣a-zA-Z\s]{2,20}$/.test(v.name.trim()) ? "한글 또는 영문 2~20자로 입력해 주세요." : null,
      // 휴대폰 번호: 숫자만 11자리, 010으로 시작 (하이픈은 자동 표시)
      phone: !/^010\d{8}$/.test(v.phone.replace(/\D/g, "")) ? "010으로 시작하는 휴대폰 번호 11자리를 숫자로 입력해 주세요." : null,
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim()) ? "이메일 형식이 올바르지 않아요." : null,
      username: !/^[a-z0-9]{4,16}$/.test(uname) ? "영문 소문자·숫자 4~16자로 입력해 주세요." : isTaken(uname) ? "이미 사용 중인 아이디예요." : checkedId !== uname ? "아이디 중복확인을 해 주세요." : null,
      // 숫자만 입력해도 되고, 영문·특수문자를 섞어도 됨 (공백 제외 8~20자)
      password: !/^[\x21-\x7e]{8,20}$/.test(v.password) ? "공백 없이 8~20자로 입력해 주세요. 숫자만 입력해도 돼요." : null,
      password2: !v.password2 || v.password !== v.password2 ? "비밀번호가 일치하지 않아요." : null,
    } as Record<Key, string | null>;
  }, [v, isTaken, checkedId]);

  const uname = v.username.trim().toLowerCase();
  const formatOk = /^[a-z0-9]{4,16}$/.test(uname);
  const checkId = async () => {
    setTouched((t) => ({ ...t, username: true }));
    if (!formatOk) return;
    setChecking(true);
    await new Promise((r) => setTimeout(r, 300));
    setChecking(false);
    setCheckedId(isTaken(uname) ? null : uname);
  };

  const valid = Object.values(errors).every((e) => !e) && agree.privacy;
  const show = (k: Key) => (touched[k] ? errors[k] : null);
  const bind = (k: Key) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setV((s) => ({ ...s, [k]: k === "phone" ? formatPhone(e.target.value) : e.target.value }));
      if (k === "username") setCheckedId(null);
    },
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    error: show(k),
  });
  const allAgree = agree.privacy && agree.marketing;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, phone: true, email: true, username: true, password: true, password2: true });
    if (!valid) {
      const first = (Object.keys(errors) as Key[]).find((k) => errors[k]);
      if (first) document.getElementById("su-" + first)?.focus();
      return;
    }
    setBusy(true);
    signingUp.current = true;
    await new Promise((r) => setTimeout(r, 600));
    const res = await signup({ ...v, agreeMarketing: agree.marketing });
    setBusy(false);
    if (res) {
      signingUp.current = false;
      setSubmitErr(res);
    } else setDone(true);
  };

  if (done)
    return (
      <div className="py-6 text-center">
        <svg viewBox="0 0 100 100" className="mx-auto mb-6 size-24">
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--ink)" strokeWidth="3" strokeDasharray="290" strokeDashoffset="290" className="[animation:draw_.8s_cubic-bezier(.22,1,.36,1)_forwards]" />
          <path d="M31 51l13 13 26-28" fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="60" className="[animation:draw_.5s_cubic-bezier(.22,1,.36,1)_.6s_forwards]" />
          <style>{`@keyframes draw{to{stroke-dashoffset:0}}`}</style>
        </svg>
        <h1 className="animate-rise text-[26px] font-extrabold tracking-[-0.035em] [animation-delay:.7s]">가입을 환영합니다</h1>
        <p className="mt-2 mb-8 animate-rise text-ink-3 [animation-delay:.8s]">{v.name}님을 위한 AI 마켓 리포트가 준비됐어요.</p>
        <button className={btn.primary + " animate-rise [animation-delay:.9s]"} onClick={() => router.replace("/dashboard")}>대시보드로 이동</button>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-9 animate-rise lg:hidden"><Brand /></div>
      <div className="mb-6 flex items-center gap-2">
        <Link href="/login" aria-label="로그인으로 돌아가기" className="-ml-2.5 inline-grid size-10 place-items-center rounded-xl text-ink-2 hover:bg-surface-2"><Icon name="chevL" /></Link>
        <h1 className="text-[26px] font-extrabold tracking-[-0.035em]">회원가입</h1>
      </div>

      <fieldset className="animate-rise">
        <legend className="mb-3 text-[12px] font-bold tracking-wider text-ink-3">기본 정보</legend>
        <Field id="su-name" label="이름" autoComplete="name" placeholder="홍길동" {...bind("name")} />
        <Field id="su-phone" label="전화번호" type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-0000-0000" {...bind("phone")} />
        <Field id="su-email" label="메일 주소" type="email" autoComplete="email" placeholder="name@example.com" {...bind("email")} />
      </fieldset>

      <fieldset className="mt-4 animate-rise [animation-delay:.06s]">
        <legend className="mb-3 text-[12px] font-bold tracking-wider text-ink-3">계정 정보</legend>
        <Field id="su-username" label="아이디" autoComplete="username" autoCapitalize="none" placeholder="영문 소문자·숫자 4~16자" {...bind("username")}
          ok={checkedId === uname && !errors.username ? "사용할 수 있는 아이디예요." : null}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); checkId(); } }}
          addon={
            <button type="button" onClick={checkId} disabled={checking || !uname || checkedId === uname}
              className="h-[52px] shrink-0 rounded-xl border border-line bg-surface px-4 text-[14px] font-semibold transition hover:border-ink-3 disabled:opacity-50">
              {checking ? <Spinner /> : checkedId === uname ? "확인 완료" : "중복확인"}
            </button>
          } />
        <Field id="su-password" label="비밀번호" type="password" autoComplete="new-password" placeholder="8~20자" hint="8~20자 · 숫자만 입력해도 돼요" {...bind("password")} />
        <Field id="su-password2" label="비밀번호 확인" type="password" autoComplete="new-password" placeholder="비밀번호 다시 입력" {...bind("password2")}
          ok={v.password2 && !errors.password2 ? "비밀번호가 일치해요." : null} />
      </fieldset>

      <fieldset className="mt-4 animate-rise [animation-delay:.12s]">
        <legend className="mb-3 text-[12px] font-bold tracking-wider text-ink-3">약관 동의</legend>
        <div className="mb-1 rounded-2xl bg-surface-2 px-4 py-1.5">
          <Check strong checked={allAgree} onChange={(c) => setAgree({ privacy: c, marketing: c })}>전체 동의</Check>
        </div>
        {(["privacy", "marketing"] as const).map((k) => (
          <div key={k} className="flex items-center justify-between pr-1 pl-4">
            <Check checked={agree[k]} onChange={(c) => setAgree((a) => ({ ...a, [k]: c }))}>
              <em className={"mr-1.5 text-[12px] font-bold not-italic " + (k === "privacy" ? "text-ink" : "text-ink-3")}>{k === "privacy" ? "필수" : "선택"}</em>
              {k === "privacy" ? "개인정보 수집 · 이용 동의" : "제3자 마케팅 정보 수신 동의"}
            </Check>
            <button type="button" onClick={() => setTerms(k)} className="shrink-0 text-[13px] text-ink-3 underline underline-offset-[3px] hover:text-ink">보기</button>
          </div>
        ))}
        <p className="mt-2 mb-6 pl-4 text-[12.5px] text-ink-3">선택 항목에 동의하지 않아도 가입하고 이용할 수 있어요.</p>
      </fieldset>

      {submitErr && <p className="mb-3 text-[13px] text-up">{submitErr}</p>}
      <button type="submit" className={btn.primary} disabled={busy || !agree.privacy}>{busy ? <Spinner /> : "가입하기"}</button>
      <p className="mt-5 text-center text-[14px] text-ink-3">
        이미 계정이 있으신가요? <Link href="/login" className="font-semibold text-ink underline-offset-4 hover:underline">로그인</Link>
      </p>

      {terms && <TermsSheet k={terms} onClose={() => setTerms(null)} onAgree={() => { setAgree((a) => ({ ...a, [terms]: true })); setTerms(null); }} />}
    </form>
  );
}

function TermsSheet({ k, onClose, onAgree }: { k: keyof typeof TERMS; onClose: () => void; onAgree: () => void }) {
  const t = TERMS[k];
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={t.title}>
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 animate-fade bg-black/45 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-[520px] animate-rise rounded-t-3xl bg-surface p-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-[18px] font-bold tracking-tight">{t.title}</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="-mt-1 -mr-2 inline-grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-surface-2"><Icon name="x" /></button>
        </div>
        <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line text-[14px]">
          {t.rows.map(([a, b]) => (
            <div key={a} className="grid grid-cols-[92px_1fr] gap-3 px-4 py-3">
              <dt className="font-semibold text-ink-2">{a}</dt>
              <dd className="text-ink">{b}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">{t.note}</p>
        <button type="button" onClick={onAgree} className={btn.primary + " mt-5"}>동의하기</button>
      </div>
    </div>
  );
}
