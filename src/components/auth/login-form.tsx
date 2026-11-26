"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers";
import { Brand } from "@/components/ui/kit";
import { Icon } from "@/components/ui/icons";
import { btn, Check, Field, Spinner } from "./fields";

export function LoginForm() {
  const { login, user, ready, toast } = useAuth();
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [keep, setKeep] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  const submit = async (e?: React.FormEvent, demo = false) => {
    e?.preventDefault();
    const u = demo ? "demo" : id, p = demo ? "demo1234!" : pw;
    if (!u || !p) return setErr("아이디와 비밀번호를 입력해 주세요.");
    setBusy(true);
    setErr(null);
    await new Promise((r) => setTimeout(r, 450));
    const res = await login(u, p, keep);
    setBusy(false);
    if (res) setErr(res);
    else router.replace("/dashboard");
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-9 animate-rise lg:hidden"><Brand /></div>
      <h1 className="animate-rise text-[28px] font-extrabold tracking-[-0.035em]">로그인</h1>
      <p className="mt-1.5 mb-7 animate-rise text-[15px] text-ink-3">AI가 정리한 오늘의 글로벌 시황을 확인하세요.</p>

      <Field id="lgId" label="아이디" autoComplete="username" placeholder="아이디 입력" value={id} onChange={(e) => setId(e.target.value)} />
      <Field id="lgPw" label="비밀번호" type="password" autoComplete="current-password" placeholder="비밀번호 입력" value={pw} onChange={(e) => setPw(e.target.value)} error={err} />

      <div className="-mt-1 mb-4 flex items-center justify-between">
        <div className="text-[14px] text-ink-2"><Check checked={keep} onChange={setKeep}>로그인 상태 유지</Check></div>
        <div className="flex items-center gap-1.5 text-[13px] text-ink-3">
          <button type="button" className="underline-offset-4 hover:text-ink hover:underline" onClick={() => toast("데모에서는 준비 중이에요.")}>아이디 찾기</button>
          <span className="text-line">|</span>
          <button type="button" className="underline-offset-4 hover:text-ink hover:underline" onClick={() => toast("데모에서는 준비 중이에요.")}>비밀번호 찾기</button>
        </div>
      </div>

      <div className="grid gap-2.5">
        <button type="submit" className={btn.primary} disabled={busy}>{busy ? <Spinner /> : "로그인"}</button>
        <button type="button" className={btn.outline} onClick={() => submit(undefined, true)} disabled={busy}>
          <Icon name="sparkle" className="size-4 text-ai" />데모 계정으로 둘러보기
        </button>
      </div>
      <p className="mt-3.5 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-3">
        <Icon name="info" className="mt-0.5 size-[15px] shrink-0" />
        데모 계정: <b className="font-semibold text-ink-2">demo</b> / <b className="font-semibold text-ink-2">demo1234!</b> · 회원 정보는 이 브라우저에만 저장돼요.
      </p>

      <div className="my-7 h-px bg-line" />
      <div className="text-center">
        <p className="mb-3 text-[14px] text-ink-3">아직 회원이 아니신가요?</p>
        <Link href="/signup" className={btn.ghost}>회원가입</Link>
      </div>
    </form>
  );
}
