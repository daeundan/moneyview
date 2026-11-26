import { AuthSide } from "@/components/auth/auth-side";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[minmax(460px,1fr)_1fr]">
      <AuthSide />
      <main className="flex justify-center px-5 pt-[calc(40px+env(safe-area-inset-top))] pb-[calc(40px+env(safe-area-inset-bottom))] sm:items-center sm:py-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
