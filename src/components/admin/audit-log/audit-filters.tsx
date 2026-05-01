'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, Filter as FilterIcon, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AuditFilters() {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Obyekt, foydalanuvchi yoki email..." className="pl-9 h-9" />
        </div>

        <Select>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Amal turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="object_created">Obyekt yaratish</SelectItem>
            <SelectItem value="object_updated">Obyekt tahrirlash</SelectItem>
            <SelectItem value="import">Import amallari</SelectItem>
            <SelectItem value="moderation">Moderatsiya</SelectItem>
            <SelectItem value="roles">Rol boshqaruvi</SelectItem>
            <SelectItem value="auth">Kirish/chiqish</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Entity turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="medical_object">Muassasa</SelectItem>
            <SelectItem value="import_job">Import</SelectItem>
            <SelectItem value="change_request">Moderatsiya so'rovi</SelectItem>
            <SelectItem value="user">Foydalanuvchi</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Darajasi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8">
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Filtrlarni tozalash
            </Button>
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700">
                <FilterIcon className="mr-2 h-3.5 w-3.5" />
                Saralash
            </Button>
        </div>
        <div className="flex items-center gap-3">
            <p className="text-[11px] text-slate-500 italic">
                Oxirgi 30 kunlik amallar ko'rsatilmoqda
            </p>
            <Button variant="outline" size="sm" className="h-8">
                <Download className="mr-2 h-3.5 w-3.5" />
                CSV Eksport
            </Button>
        </div>
      </div>
    </div>
  );
}