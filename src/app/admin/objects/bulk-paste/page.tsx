import { BulkPasteGrid } from "@/components/admin/objects-management/bulk-paste-grid";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function BulkPastePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-slate-500">
          <Link href="/admin/objects">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Muassasalar ro'yxatiga qaytish
          </Link>
        </Button>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Excel jadvaldan kiritish</h1>
          <p className="text-muted-foreground">
            Excel yoki Google Sheets’dan ma’lumotlarni nusxalab, jadvalga joylashtiring. 
            Ma'lumotlar avtomatik ravishda tekshiriladi.
          </p>
        </div>
      </div>
      
      <BulkPasteGrid />
    </div>
  );
}
