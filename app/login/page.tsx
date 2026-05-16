import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next =
    searchParams.next && searchParams.next.startsWith("/")
      ? searchParams.next
      : "/studio";
  const user = await getSessionUser();
  if (user) redirect(next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 via-background to-background p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.png"
            alt="Yörünge"
            width={64}
            height={64}
            priority
            className="object-contain"
          />
          <div>
            <p className="text-lg font-bold tracking-tight">
              Light<span className="text-primary">Sim</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Üyelere özel — analiz için giriş yapın
            </p>
          </div>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
