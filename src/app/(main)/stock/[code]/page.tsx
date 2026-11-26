import type { Metadata } from "next";
import { Suspense } from "react";
import { StockView } from "@/components/market/stock-view";


/** 제목은 화면(StockView)에서 종목명으로 바꿔 줍니다 */
export const metadata: Metadata = { title: "종목 시세" };

/** 자주 보는 종목만 미리 생성 — 나머지는 요청 시 렌더링 */
export function generateStaticParams() {
  return [{ code: "005930" }, { code: "000660" }];
}

async function StockContent({ params }: { params: PageProps<"/stock/[code]">["params"] }) {
  const { code } = await params;
  return <StockView key={code} code={code} />;
}

export default function StockPage(props: PageProps<"/stock/[code]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1120px] space-y-4 pt-10"><div className="skeleton h-12 w-64 rounded-xl" /><div className="skeleton h-[360px] rounded-3xl" /></div>}>
      <StockContent params={props.params} />
    </Suspense>
  );
}
