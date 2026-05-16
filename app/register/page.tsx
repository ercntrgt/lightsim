import Image from "next/image";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
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
              Light<span className="text-primary">Sim</span> üyelik
            </p>
            <p className="text-xs text-muted-foreground">
              Kayıt sonrası süper admin onayı gerekir
            </p>
          </div>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
}
