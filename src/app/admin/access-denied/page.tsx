'use client';

import { ShieldAlert, ArrowLeft, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function AccessDeniedPage() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full border-red-100 shadow-xl shadow-red-900/5">
        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-50/50">
            <ShieldAlert className="h-10 w-10" />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 mb-2">Ruxsat yo‘q</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Ushbu bo‘limdan foydalanish uchun sizda yetarli ruxsat mavjud emas. 
            Iltimos, boshqa rol tanlang yoki administrator bilan bog‘laning.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <Button variant="outline" asChild className="w-full">
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Bosh sahifa
              </Link>
            </Button>
            <Button asChild className="w-full bg-slate-900 hover:bg-slate-800">
              <Link href="/select-role">
                <SwitchCamera className="mr-2 h-4 w-4" />
                Rolni o‘zgartirish
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-slate-400 font-medium uppercase tracking-widest">
        Security System • GIS Tibbiyot Portal
      </p>
    </div>
  );
}
