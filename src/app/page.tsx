import { redirect } from "next/navigation";

/** 루트 접속 시 대시보드로 이동 (로그인 안 되어 있으면 대시보드에서 로그인으로 보냄) */
export default function Home() {
  redirect("/dashboard");
}
