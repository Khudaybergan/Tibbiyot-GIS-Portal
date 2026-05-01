'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, Filter as FilterIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ModerationFilters() {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Muassasa nomi yoki so'rovchi..." className="pl-9 h-9" />
        </div>

        <Select>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="So'rov turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="create">Yangi yaratish</SelectItem>
            <SelectItem value="update">Tahrirlash</SelectItem>
            <SelectItem value="archive">Arxivlash</SelectItem>
            <SelectItem value="delete">O'chirish</SelectItem>
            <SelectItem value="restore">Tiklash</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Holati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="pending">Kutilmoqda</SelectItem>
            <SelectItem value="approved">Tasdiqlangan</SelectItem>
            <SelectItem value="rejected">Rad etilgan</SelectItem>
            <SelectItem value="needs_changes">Tuzatish kerak</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Ustuvorlik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="high">Yuqori</SelectItem>
            <SelectItem value="normal">O'rta</SelectItem>
            <SelectItem value="low">Past</SelectItem>
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
        <p className="text-[11px] text-slate-500 italic">
          Jami 12 ta so'rov topildi
        </p>
      </div>
    </div>
  );
}
