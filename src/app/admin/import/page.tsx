import { ImportWizard } from "@/components/admin/import-wizard";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-slate-500">
          <Link href="/admin/objects">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Obyektlar ro'yxatiga qaytish
          </Link>
        </Button>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Ma'lumotlar Importi</h1>
          <p className="text-muted-foreground">
            CSV, Excel, GeoJSON yoki JSON formatdagi fayllarni yuklash va tizimga qo'shish.
          </p>
        </div>
      </div>
      <ImportWizard />
    </div>
  );
}