"use client";
/* =========================================================
   인증 (데모) — 브라우저 localStorage에 회원 정보를 저장합니다.
   실제 서비스에서는 이 부분을 서버 API(회원 DB, 세션/JWT)로
   교체해야 합니다. 비밀번호는 SHA-256 해시로만 보관합니다.
   ========================================================= */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface User {
  name: string;
  phone: string;
  email: string;
  username: string;
  agreePrivacy: true;
  agreeMarketing: boolean;
  joinedAt: string;
  consentLog: { at: string; text: string }[];
}
interface StoredUser extends User {
  pwHash: string;
}
export interface SignupInput {
  name: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  agreeMarketing: boolean;
}

interface AuthCtx {
  ready: boolean;
  user: User | null;
  login: (username: string, password: string, keep: boolean) => Promise<string | null>;
  signup: (input: SignupInput) => Promise<string | null>;
  logout: () => void;
  isTaken: (username: string) => boolean;
  setMarketing: (v: boolean) => void;
  toast: (msg: string) => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const K_USERS = "mv_users";
const K_SESSION = "mv_session";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("moneyview:" + s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const strip = (u: StoredUser): User => {
  const { pwHash, ...rest } = u;
  void pwHash;
  return rest;
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [session, setSession] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => {
    (async () => {
      let list = read<StoredUser[]>(K_USERS, []);
      if (!list.some((u) => u.username === "demo")) {
        list = [
          {
            name: "김머니", phone: "010-1234-5678", email: "demo@moneyview.kr", username: "demo",
            pwHash: await sha256("demo1234!"), agreePrivacy: true, agreeMarketing: true, joinedAt: "2026.11.01 10:00",
            consentLog: [{ at: "2026.11.01 10:00", text: "가입 · 개인정보 수집·이용(필수) · 제3자 마케팅 수신(선택) 동의" }],
          },
          ...list,
        ];
        write(K_USERS, list);
      }
      setUsers(list);
      let s: string | null = null;
      try {
        s = localStorage.getItem(K_SESSION) || sessionStorage.getItem(K_SESSION);
      } catch {}
      setSession(s);
      setReady(true);
    })();
  }, []);

  const save = useCallback((list: StoredUser[]) => {
    setUsers(list);
    write(K_USERS, list);
  }, []);

  const startSession = (username: string, keep: boolean) => {
    try {
      (keep ? localStorage : sessionStorage).setItem(K_SESSION, username);
    } catch {}
    setSession(username);
  };

  const toast = useCallback((text: string) => setMsg({ text, id: Math.random() }), []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2400);
    return () => clearTimeout(t);
  }, [msg]);

  const value = useMemo<AuthCtx>(() => {
    const cur = users.find((u) => u.username === session);
    return {
      ready,
      user: cur ? strip(cur) : null,
      isTaken: (username) => users.some((u) => u.username === username.trim().toLowerCase()),
      async login(username, password, keep) {
        const u = users.find((x) => x.username === username.trim().toLowerCase());
        if (!u || u.pwHash !== (await sha256(password))) return "아이디 또는 비밀번호가 일치하지 않아요.";
        startSession(u.username, keep);
        return null;
      },
      async signup(input) {
        const username = input.username.trim().toLowerCase();
        if (users.some((u) => u.username === username)) return "이미 사용 중인 아이디예요.";
        const at = stamp();
        const nu: StoredUser = {
          name: input.name.trim(), phone: input.phone, email: input.email.trim(), username,
          pwHash: await sha256(input.password), agreePrivacy: true, agreeMarketing: input.agreeMarketing, joinedAt: at,
          consentLog: [{ at, text: `가입 · 개인정보 수집·이용(필수)${input.agreeMarketing ? " · 제3자 마케팅 수신(선택)" : ""} 동의` }],
        };
        save([...users, nu]);
        startSession(username, true);
        return null;
      },
      logout() {
        try {
          localStorage.removeItem(K_SESSION);
          sessionStorage.removeItem(K_SESSION);
        } catch {}
        setSession(null);
      },
      setMarketing(v) {
        save(users.map((u) => (u.username === session ? { ...u, agreeMarketing: v, consentLog: [...u.consentLog, { at: stamp(), text: `제3자 마케팅 수신 ${v ? "동의" : "철회"}` }] } : u)));
      },
      toast,
    };
  }, [ready, users, session, save, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex justify-center px-4 md:bottom-8">
        {msg && (
          <div key={msg.id} className="animate-rise rounded-xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-2xl">
            {msg.text}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <Providers>");
  return c;
}
