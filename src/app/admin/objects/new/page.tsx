"use client";

import { InstitutionForm } from "@/components/admin/objects-management/institution-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewInstitutionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-slate-500">
          <Link href="/admin/objects">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Muassasalar ro'yxatiga qaytish
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Yangi muassasa qo‘shish</h1>
          <p className="text-sm text-slate-500">
            Muassasa ma’lumotlari, manzili va xaritadagi joylashuvini kiriting
          </p>
        </div>
      </div>

      <InstitutionForm mode="create" />
    </div>
  );
}
