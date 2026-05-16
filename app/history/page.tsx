import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { HistoryList } from "@/components/auth/HistoryList";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/history");
  return (
    <main className="min-h-screen bg-background">
      <HistoryList />
    </main>
  );
}
