"use client";
import { useAuth } from "@/components/providers";
import { cx, maskPhone } from "@/lib/format";
import { Icon } from "@/components/ui/icons";

export function MeView() {
  const { user, setMarketing, logout, toast } = useAuth();
  if (!user) return null;
  const rows: [string, string][] = [
    ["이름", user.name],
    ["아이디", user.username],
    ["메일 주소", user.email],
    ["전화번호", maskPhone(user.phone)],
    ["가입일", user.joinedAt.slice(0, 10)],
  ];
  return (
    <div className="mx-auto max-w-[880px]">
      <h1 className="mb-6 animate-rise text-[28px] font-extrabold tracking-[-0.04em]">내 정보</h1>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        <section className="card animate-rise p-6 md:col-span-2">
          <span className="grid size-16 place-items-center rounded-full bg-ink text-[20px] font-bold text-bg">{user.name.slice(-2)}</span>
          <h2 className="mt-4 text-[20px] font-bold">{user.name}</h2>
          <p className="text-[13px] text-ink-3">일반 회원</p>
          <dl className="mt-5 divide-y divide-line text-[14px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-3">{k}</dt>
                <dd className="num truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <button onClick={() => toast("데모에서는 준비 중이에요.")} className="mt-5 h-11 w-full rounded-xl border border-line text-[14px] font-semibold transition hover:border-ink-3">내 정보 수정</button>
        </section>

        <section className="card animate-rise p-6 [animation-delay:.06s] md:col-span-3">
          <h2 className="text-[17px] font-bold">동의 내역</h2>
          <div className="mt-3 divide-y divide-line">
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <b className="text-[15px] font-semibold">개인정보 수집 · 이용</b>
                <p className="text-[12.5px] text-ink-3">필수 · 이름, 전화번호, 이메일, 아이디, 비밀번호</p>
              </div>
              <span className="shrink-0 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">동의함</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <b className="text-[15px] font-semibold">제3자 마케팅 정보 수신</b>
                <p className="text-[12.5px] text-ink-3">선택 · 제휴 증권사·금융사 / SMS · 이메일</p>
              </div>
              <button role="switch" aria-checked={user.agreeMarketing} aria-label="제3자 마케팅 정보 수신 동의"
                onClick={() => { setMarketing(!user.agreeMarketing); toast(user.agreeMarketing ? "마케팅 수신 동의를 철회했어요." : "마케팅 수신에 동의했어요."); }}
                className={cx("relative h-[26px] w-[42px] shrink-0 rounded-full transition-colors", user.agreeMarketing ? "bg-ink" : "bg-line")}>
                <span className={cx("absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow transition-transform duration-300 dark:bg-surface", user.agreeMarketing && "translate-x-4")} />
              </button>
            </div>
          </div>
          <h3 className="mt-4 mb-2 text-[13px] font-semibold text-ink-2">변경 이력</h3>
          <ul className="space-y-1.5 rounded-2xl bg-surface-2 p-4 text-[12.5px]">
            {[...user.consentLog].reverse().map((h, k) => (
              <li key={k} className="flex justify-between gap-4">
                <span className="text-ink-2">{h.text}</span>
                <time className="num shrink-0 text-ink-3">{h.at}</time>
              </li>
            ))}
          </ul>
          <button onClick={logout} className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-3 transition hover:text-ink">
            <Icon name="logout" className="size-4" />로그아웃
          </button>
        </section>
      </div>
    </div>
  );
}
