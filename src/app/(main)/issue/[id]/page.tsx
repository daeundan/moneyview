import type { Metadata } from "next";
import { Suspense } from "react";
import { ISSUES } from "@/lib/issues";
import { IssueView } from "@/components/issue/issue-view";

/** 데모 이슈만 미리 생성 — 실시간 이슈 id는 요청 시점에 렌더링 */
export function generateStaticParams() {
  return ISSUES.map((x) => ({ id: x.id }));
}

/** 제목은 화면(IssueView)에서 키워드로 바꿔 줍니다 — URL을 읽는 generateMetadata는 미리 불러오기를 막아요. */
export const metadata: Metadata = { title: "이슈 요약 리포트" };


/** params(URL 데이터)는 Suspense 안에서 읽어야 Cache Components 규칙에 맞습니다. */
async function IssueContent({ params }: { params: PageProps<"/issue/[id]">["params"] }) {
  const { id } = await params;
  // 실시간 이슈는 id가 계속 새로 생기므로, 존재 여부는 화면(IssueView)에서 API로 확인합니다.
  return <IssueView key={id} id={id} />;
}

function IssueSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px] space-y-4 pt-10">
      <div className="skeleton h-6 w-40 rounded-full" />
      <div className="skeleton h-10 w-72 rounded-xl" />
      <div className="skeleton h-5 w-full max-w-[560px] rounded-full" />
      <div className="skeleton mt-6 h-48 w-full rounded-3xl" />
    </div>
  );
}

export default function IssuePage(props: PageProps<"/issue/[id]">) {
  return (
    <Suspense fallback={<IssueSkeleton />}>
      <IssueContent params={props.params} />
    </Suspense>
  );
}
