"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  FileDown, 
  ClipboardCheck, 
  Eraser, 
  HelpCircle,
  Loader2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { BulkPasteRow, BulkPasteRowStatus } from "@/lib/types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const GRID_COLUMNS = [
  { key: "name", label: "Muassasa nomi", required: true },
  { key: "object_type", label: "Muassasa turi", required: true },
  { key: "ownership_type", label: "Mulk shakli", required: true },
  { key: "region", label: "Viloyat", required: true },
  { key: "district", label: "Tuman", required: true },
  { key: "mahalla", label: "Mahalla", required: true },
  { key: "address", label: "Manzil", required: true },
  { key: "inn", label: "INN", required: true },
  { key: "lat", label: "Latitude", required: true },
  { key: "lon", label: "Longitude", required: true },
  { key: "phone", label: "Telefon", required: true },
  { key: "email", label: "Email", required: false },
  { key: "website", label: "Veb-sayt", required: false },
  { key: "license_number", label: "Litsenziya", required: false },
  { key: "old_cadastre", label: "Eski kadastr", required: false },
  { key: "new_cadastre", label: "Yangi kadastr", required: false },
  { key: "notes", label: "Izoh", required: false },
];

const UZBEKISTAN_BOUNDS = {
  latMin: 37.0,
  latMax: 45.7,
  lngMin: 55.8,
  lngMax: 73.3
};

const EMPTY_ROW = (): BulkPasteRow => ({
  id: crypto.randomUUID(),
  name: "",
  object_type: "",
  ownership_type: "",
  region: "",
  district: "",
  mahalla: "",
  address: "",
  inn: "",
  lat: "",
  lon: "",
  phone: "",
  email: "",
  website: "",
  license_number: "",
  old_cadastre: "",
  new_cadastre: "",
  notes: "",
  status: "draft",
  messages: []
});

export function BulkPasteGrid() {
  const { toast } = useToast();
  const [rows, setRows] = useState<BulkPasteRow[]>([]);
  const [isSampleOpen, setIsSampleOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [filter, setFilter] = useState<string>("all");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("bulk_paste_draft");
    if (saved) {
      try {
        setRows(JSON.parse(saved));
      } catch (e) {
        setRows(Array(10).fill(null).map(EMPTY_ROW));
      }
    } else {
      setRows(Array(10).fill(null).map(EMPTY_ROW));
    }
  }, []);

  // Autosave
  useEffect(() => {
    if (rows.length > 0) {
      localStorage.setItem("bulk_paste_draft", JSON.stringify(rows));
    }
  }, [rows]);

  const validateRow = (row: BulkPasteRow, allRows: BulkPasteRow[]): BulkPasteRow => {
    const messages: string[] = [];
    let status: BulkPasteRowStatus = "valid";

    // Required fields
    GRID_COLUMNS.forEach(col => {
      if (col.required && !row[col.key as keyof BulkPasteRow]?.toString().trim()) {
        messages.push(`${col.label} majburiy`);
        status = "error";
      }
    });

    // INN validation
    if (row.inn && !/^\d{9}$/.test(row.inn)) {
      messages.push("INN 9 ta raqamdan iborat bo'lishi kerak");
      status = "error";
    }

    // Coordinates
    const lat = parseFloat(row.lat);
    const lon = parseFloat(row.lon);
    if (row.lat || row.lon) {
      if (isNaN(lat) || isNaN(lon)) {
        messages.push("Koordinata noto'g'ri formatda");
        status = "error";
      } else if (
        lat < UZBEKISTAN_BOUNDS.latMin || lat > UZBEKISTAN_BOUNDS.latMax || 
        lon < UZBEKISTAN_BOUNDS.lngMin || lon > UZBEKISTAN_BOUNDS.lngMax
      ) {
        messages.push("Koordinata O'zbekistondan tashqarida");
        status = "warning";
        if (status !== "error") status = "warning";
      }
    }

    // Duplicates within grid
    const duplicateCount = allRows.filter(r => r.id !== row.id && r.inn && r.inn === row.inn).length;
    if (duplicateCount > 0) {
      messages.push("Jadvalda takroriy INN");
      status = "duplicate";
    }

    return { ...row, status, messages };
  };

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => {
      setRows(prev => prev.map(row => {
        if (!row.name && !row.inn) return row; // Skip truly empty
        return validateRow(row, prev);
      }));
      setIsValidating(false);
      toast({ title: "Tekshirish yakunlandi" });
    }, 800);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardData = e.clipboardData.getData("text");
    const lines = clipboardData.split(/\r?\n/);
    if (lines.length === 0) return;

    const newRows: BulkPasteRow[] = [];
    lines.forEach(line => {
      if (!line.trim()) return;
      const values = line.split("\t");
      const row = EMPTY_ROW();
      GRID_COLUMNS.forEach((col, idx) => {
        if (values[idx] !== undefined) {
          (row as any)[col.key] = values[idx].trim();
        }
      });
      newRows.push(row);
    });

    // Replace empty rows or append
    setRows(prev => {
      const firstNonEmpty = prev.findIndex(r => r.name || r.inn || r.address);
      if (firstNonEmpty === -1) return newRows;
      return [...prev.filter(r => r.name || r.inn || r.address), ...newRows];
    });

    toast({ title: `${newRows.length} ta qator qo'shildi` });
  };

  const handleCellChange = (id: string, key: string, value: string) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, [key]: value, status: "draft", messages: [] } : row
    ));
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, EMPTY_ROW()]);
  };

  const handleClear = () => {
    if (confirm("Jadvalni butunlay tozalashni tasdiqlaysizmi?")) {
      setRows(Array(10).fill(null).map(EMPTY_ROW));
      localStorage.removeItem("bulk_paste_draft");
    }
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => r.status === "valid" || r.status === "warning");
    if (validRows.length === 0) {
      toast({ variant: "destructive", title: "Import qilish uchun to'g'ri qatorlar topilmadi" });
      return;
    }

    setIsImporting(true);
    // Simulate import
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setImportResult({
      total: rows.filter(r => r.name || r.inn).length,
      success: validRows.length,
      failed: rows.filter(r => r.status === "error").length,
      duplicates: rows.filter(r => r.status === "duplicate").length
    });
    
    setIsImporting(false);
    setIsImportOpen(false);
  };

  const filteredRows = rows.filter(row => {
    if (filter === "all") return true;
    if (!row.name && !row.inn) return false;
    return row.status === filter;
  });

  const stats = {
    total: rows.filter(r => r.name || r.inn).length,
    valid: rows.filter(r => r.status === "valid").length,
    error: rows.filter(r => r.status === "error").length,
    warning: rows.filter(r => r.status === "warning").length,
    duplicate: rows.filter(r => r.status === "duplicate").length,
  };

  const downloadCSV = () => {
    const headers = GRID_COLUMNS.map(c => c.label).join(",");
    const body = rows
      .filter(r => r.name || r.inn)
      .map(r => GRID_COLUMNS.map(c => `"${(r as any)[c.key]}"`).join(","))
      .join("\n");
    
    const blob = new Blob([`${headers}\n${body}`], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_import_template.csv";
    a.click();
  };

  if (importResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500">
        <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Import muvaffaqiyatli yakunlandi</h2>
        <p className="text-slate-500 max-w-md text-center mb-10">
          Jami {importResult.total} ta qatordan {importResult.success} tasi tizimga qo'shildi.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl mb-12">
          {[
            { label: 'Qo\'shildi', val: importResult.success, color: 'text-emerald-600' },
            { label: 'Xato', val: importResult.failed, color: 'text-red-500' },
            { label: 'Takroriy', val: importResult.duplicates, color: 'text-indigo-600' },
            { label: 'Jami', val: importResult.total, color: 'text-slate-900' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 p-4 rounded-xl border flex flex-col items-center">
              <span className="text-2xl font-bold mb-1">{item.val}</span>
              <span className="text-[10px] font-bold uppercase text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setImportResult(null)}>Yangi jadval</Button>
          <Button asChild>
            <Link href="/admin/objects">
              Ro'yxatga o'tish
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 bg-background/95 backdrop-blur py-2 border-b">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsSampleOpen(true)}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Namuna ko'rish
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <Eraser className="mr-2 h-4 w-4" />
            Tozalash
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <FileDown className="mr-2 h-4 w-4" />
            CSV yuklab olish
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleValidate} disabled={isValidating || stats.total === 0}>
            {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
            Tekshirish
          </Button>
          <Button size="sm" onClick={() => setIsImportOpen(true)} disabled={stats.total === 0 || isValidating} className="bg-emerald-600 hover:bg-emerald-700">
            <Database className="mr-2 h-4 w-4" />
            Import qilish
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Jami', val: stats.total, color: 'text-slate-900', key: 'all' },
          { label: 'To\'g\'ri', val: stats.valid, color: 'text-emerald-600', key: 'valid' },
          { label: 'Xato', val: stats.error, color: 'text-red-600', key: 'error' },
          { label: 'Ogohlantirish', val: stats.warning, color: 'text-amber-600', key: 'warning' },
          { label: 'Takroriy', val: stats.duplicate, color: 'text-indigo-600', key: 'duplicate' },
          { label: 'Qoralama', val: rows.filter(r => r.status === 'draft' && (r.name || r.inn)).length, color: 'text-slate-400', key: 'draft' },
        ].map((stat, i) => (
          <button 
            key={i} 
            onClick={() => setFilter(stat.key)}
            className={cn(
              "bg-slate-50 rounded-xl p-3 border flex flex-col gap-1 text-left transition-all hover:ring-2 hover:ring-primary/20",
              filter === stat.key && "ring-2 ring-primary border-primary bg-primary/5"
            )}
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className={cn("text-lg font-bold", stat.color)}>{stat.val}</p>
          </button>
        ))}
      </div>

      {/* Grid Section */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden" onPaste={handlePaste}>
        <ScrollArea className="w-full">
          <div className="min-w-[2000px]">
            <Table className="border-collapse">
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12 text-center border-r bg-slate-100">#</TableHead>
                  <TableHead className="w-32 border-r">Holat</TableHead>
                  {GRID_COLUMNS.map(col => (
                    <TableHead key={col.key} className="min-w-[150px] border-r">
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.required && <span className="text-red-500">*</span>}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-64">Xatoliklar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row, idx) => (
                  <TableRow key={row.id} className={cn(
                    "group",
                    row.status === 'error' && "bg-red-50/30",
                    row.status === 'warning' && "bg-amber-50/30",
                    row.status === 'duplicate' && "bg-indigo-50/30"
                  )}>
                    <TableCell className="text-center font-mono text-[10px] border-r bg-slate-50/50">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="border-r">
                      <div className="flex items-center gap-2">
                        {row.status === 'draft' && <Badge variant="outline" className="text-[10px] bg-white">Qoralama</Badge>}
                        {row.status === 'valid' && <Badge className="bg-emerald-600 text-[10px]">To'g'ri</Badge>}
                        {row.status === 'warning' && <Badge className="bg-amber-500 text-[10px]">Ogoh.</Badge>}
                        {row.status === 'error' && <Badge variant="destructive" className="text-[10px]">Xato</Badge>}
                        {row.status === 'duplicate' && <Badge variant="outline" className="border-indigo-500 text-indigo-600 text-[10px]">Takroriy</Badge>}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-slate-400 hover:text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => setRows(prev => prev.filter(r => r.id !== row.id))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    {GRID_COLUMNS.map(col => (
                      <TableCell key={col.key} className="p-0 border-r focus-within:ring-2 focus-within:ring-primary/50 relative">
                        <input 
                          type="text"
                          value={(row as any)[col.key] || ""}
                          onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                          className={cn(
                            "w-full h-10 px-3 py-1 text-xs bg-transparent border-none outline-none focus:ring-0",
                            col.required && !(row as any)[col.key] && row.status !== 'draft' && "bg-red-50/50"
                          )}
                          placeholder="..."
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex flex-col gap-0.5 max-w-[250px]">
                        {row.messages.map((m, i) => (
                          <div key={i} className="flex items-center gap-1 text-[9px] text-red-500 italic">
                            <AlertCircle className="h-2.5 w-2.5" />
                            {m}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="flex justify-between items-center py-4">
        <Button variant="ghost" size="sm" onClick={handleAddRow}>
          <Plus className="mr-2 h-4 w-4" />
          Qator qo'shish
        </Button>
        <p className="text-[10px] text-slate-400 italic">
          Maslahat: Excel jadvalidan bir nechta qatorni nusxalash (Ctrl+C) va birinchi katakka joylashtirish (Ctrl+V) orqali kiritishingiz mumkin.
        </p>
      </div>

      {/* Modals */}
      <Dialog open={isSampleOpen} onOpenChange={setIsSampleOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Jadval namunasi</DialogTitle>
            <DialogDescription>Excelda ushbu ustunlar tartibida ma'lumotlarni tayyorlang</DialogDescription>
          </DialogHeader>
          <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-[10px] text-slate-300 border-collapse">
              <thead>
                <tr>
                  {GRID_COLUMNS.map(c => <th key={c.key} className="border border-slate-700 p-2 whitespace-nowrap">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {GRID_COLUMNS.map(c => <td key={c.key} className="border border-slate-700 p-2">Namuna ma'lumot</td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={downloadCSV}>
              <FileDown className="mr-2 h-4 w-4" />
              CSV Shablonni yuklab olish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importni tasdiqlash</DialogTitle>
            <DialogDescription>
              {stats.error > 0 ? (
                <span className="text-red-500 flex items-center gap-2 font-bold mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  Diqqat: {stats.error} ta qatorda xatolik bor va ular import qilinmaydi!
                </span>
              ) : "Barcha ma'lumotlar importga tayyor."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-4">
              <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-900">Xavfsiz import</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Import jarayoni audit tarixida saqlanadi. Jami {stats.valid + stats.warning} ta obyekt tizimga qo'shiladi.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsImportOpen(false)} disabled={isImporting}>Bekor qilish</Button>
            <Button onClick={handleImport} disabled={isImporting || (stats.valid + stats.warning === 0)} className="bg-emerald-600 hover:bg-emerald-700">
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Tasdiqlash va Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
