import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// M1 yer tutucu — DXF hattı, simülasyon ve 3D sonraki milestone'larda
// bu sayfaya bağlanacak.
export default function StudioPage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold">Stüdyo</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Çalışma alanı hazırlanıyor. DXF yükleme, katman eşleme, simülasyon ve
        3D görselleştirme adımları sırasıyla eklenecek.
      </p>
      <Link href="/" className="mt-8">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Ana sayfa
        </Button>
      </Link>
    </main>
  );
}
