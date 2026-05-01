"use client";

import { InstitutionForm } from "@/components/admin/objects-management/institution-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { adminMedicalObjects } from "@/lib/admin/mock-data";
import type { MedicalObject } from "@/lib/types";

export default function EditInstitutionPage() {
  const params = useParams();
  const id = params.id as string;
  const [object, setObject] = useState<MedicalObject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => {
      const found = adminMedicalObjects.find(o => o.id.toString() === id);
      if (found) {
        setObject(found as any);
      }
      setLoading(false);
    }, 800);
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!object) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <p className="text-slate-500">Muassasa topilmadi.</p>
        <Button asChild>
          <Link href="/admin/objects">Orqaga qaytish</Link>
        </Button>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Muassasani tahrirlash</h1>
          <p className="text-sm text-slate-500">
            {object.name} ma'lumotlarini yangilang
          </p>
        </div>
      </div>

      <InstitutionForm mode="edit" initialData={object} />
    </div>
  );
}
