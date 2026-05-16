"use client";

import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";

export function LandingAuthButtons() {
  const { user, loading } = useAuth();

  if (loading)
    return <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />;

  if (user)
    return (
      <Link href="/studio">
        <Button size="sm" className="gap-2">
          Stüdyoya Git <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );

  return (
    <div className="flex items-center gap-2">
      <Link href="/register">
        <Button size="sm" variant="ghost">
          Kayıt ol
        </Button>
      </Link>
      <Link href="/login?next=/studio">
        <Button size="sm" className="gap-2">
          <LogIn className="h-4 w-4" /> Giriş
        </Button>
      </Link>
    </div>
  );
}
