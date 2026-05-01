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
import { useState } from "react";

export function FilterBar() {
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Muassasa nomi, INN yoki manzil" className="pl-9" />
        </div>

        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger>
            <SelectValue placeholder="Viloyat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tashkent">Toshkent shahri</SelectItem>
            <SelectItem value="samarqand">Samarqand viloyati</SelectItem>
            <SelectItem value="fergana">Farg'ona viloyati</SelectItem>
          </SelectContent>
        </Select>

        <Select disabled={!selectedRegion}>
          <SelectTrigger>
            <SelectValue placeholder={selectedRegion ? "Tuman" : "Avval viloyatni tanlang"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="chilonzor">Chilonzor tumani</SelectItem>
            <SelectItem value="yunusobod">Yunusobod tumani</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Muassasa turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hospital">Shifoxona</SelectItem>
            <SelectItem value="clinic">Klinika</SelectItem>
            <SelectItem value="pharmacy">Dorixona</SelectItem>
            <SelectItem value="lab">Laboratoriya</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Mulk shakli" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="state">Davlat</SelectItem>
            <SelectItem value="private">Xususiy</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Moderatsiya holati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approved">Tasdiqlangan</SelectItem>
            <SelectItem value="pending">Kutilmoqda</SelectItem>
            <SelectItem value="rejected">Rad etilgan</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Faollik holati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Faol</SelectItem>
            <SelectItem value="archived">Arxivda</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Koordinata holati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="valid">Mavjud</SelectItem>
            <SelectItem value="missing">Yo'q</SelectItem>
            <SelectItem value="invalid">Xato</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setSelectedRegion("")}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Tozalash
          </Button>
          <Button className="flex-1 bg-primary">
            <FilterIcon className="mr-2 h-4 w-4" />
            Saralash
          </Button>
        </div>
      </div>
    </div>
  );
}
