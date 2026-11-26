/** 페이지를 옮길 때마다 새로 그려지는 껍데기 — 부드럽게 나타나는 전환 효과 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
