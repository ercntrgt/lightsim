import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { AdminPanel } from "@/components/auth/AdminPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "super_admin") redirect("/studio");
  return (
    <main className="min-h-screen bg-background">
      <AdminPanel />
    </main>
  );
}
