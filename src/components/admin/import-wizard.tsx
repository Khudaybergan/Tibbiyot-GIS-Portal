'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Upload, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  Database, 
  Settings2, 
  LayoutList, 
  FileText,
  BadgeAlert,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ImportJob, ImportPreviewRow, ImportJobStatus, ImportPreviewRowStatus } from '@/lib/types';

type ImportStep = 1 | 2 | 3 | 4 | 5 | 6;

const UZBEKISTAN_BOUNDS = {
  latMin: 37.0,
  latMax: 45.7,
  lngMin: 55.8,
  lngMax: 73.3
};

const SYSTEM_FIELDS = [
  { id: 'name', label: 'Muassasa nomi', required: true },
  { id: 'type', label: 'Muassasa turi', required: false },
  { id: 'ownership', label: 'Mulk shakli', required: false },
  { id: 'region', label: 'Viloyat', required: true },
  { id: 'district', label: 'Tuman', required: true },
  { id: 'mahalla', label: 'Mahalla', required: false },
  { id: 'address', label: 'Aniq manzil', required: true },
  { id: 'inn', label: 'INN (STIR)', required: false },
  { id: 'lat', label: 'Kenglik (Lat)', required: false },
  { id: 'lon', label: 'Uzunlik (Lon)', required: false },
  { id: 'phone', label: 'Telefon', required: false },
  { id: 'email', label: 'Email', required: false },
  { id: 'website', label: 'Veb-sayt', required: false },
  { id: 'source', label: 'Manba', required: false },
];

const AUTO_MAPPING_RULES: Record<string, string[]> = {
  name: ['nomi', 'obyekt_nom', 'muassasa nomi', 'организация', 'name'],
  region: ['viloyat', 'region', 'область', 'region_nam'],
  district: ['tuman', 'district', 'район', 'district_n'],
  mahalla: ['mahalla', 'neighborhood', 'махалля', 'mahalla_na'],
  address: ['manzil', 'address', 'адрес', 'manzili__v'],
  inn: ['inn', 'stir', 'инн', 'tin'],
  lat: ['lat', 'latitude', 'kenglik', 'широта'],
  lon: ['lon', 'lng', 'longitude', 'uzunlik', 'долгота'],
  phone: ['phone', 'tel', 'telefon', 'телефон'],
};

export function ImportWizard() {
  const [step, setStep] = useState<ImportStep>(1);
  const [importType, setImportType] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importMode, setImportMode] = useState<'create' | 'upsert_inn' | 'upsert_name'>('create');
  const [progress, setProgress] = useState(0);
  const [finalStatus, setFinalStatus] = useState<any>(null);

  // Simulated file parsing
  useEffect(() => {
    if (step === 3 && Object.keys(mapping).length === 0) {
      // Auto-map based on fake headers from step 2 selection
      const fakeHeaders = ['nomi', 'viloyat', 'tuman', 'manzil', 'INN', 'lat', 'lon', 'tel'];
      const initialMapping: Record<string, string> = {};
      
      SYSTEM_FIELDS.forEach(field => {
        const rules = AUTO_MAPPING_RULES[field.id] || [];
        const match = fakeHeaders.find(h => rules.includes(h.toLowerCase()));
        if (match) initialMapping[field.id] = match;
      });
      
      setMapping(initialMapping);
    }
  }, [step]);

  const validateRows = () => {
    setParsing(true);
    // Simulate validation delay
    setTimeout(() => {
      const mockRows: ImportPreviewRow[] = [
        {
          rowNumber: 1,
          data: { nomi: "Shox Med Center", viloyat: "Toshkent sh.", tuman: "Mirzo Ulug'bek", INN: "301122334", lat: 41.3392, lon: 69.3381 },
          mapped: { name: "Shox Med Center", region: "Toshkent sh.", district: "Mirzo Ulug'bek", address: "kuch., 15", inn: "301122334" },
          status: "valid",
          messages: []
        },
        {
          rowNumber: 2,
          data: { nomi: "Darmon Servis", viloyat: "Toshkent sh.", tuman: "Chilonzor", lat: 41.28, lon: 69.20 },
          mapped: { name: "Darmon Servis", region: "Toshkent sh.", district: "Chilonzor" },
          status: "warning",
          messages: ["INN kiritilmagan"]
        },
        {
          rowNumber: 3,
          data: { nomi: "Noma'lum Markaz", viloyat: "", tuman: "", lat: 10.0, lon: 20.0 },
          mapped: { name: "Noma'lum Markaz" },
          status: "error",
          messages: ["Viloyat majburiy", "Tuman majburiy", "Koordinata O'zbekistondan tashqarida"]
        },
        {
          rowNumber: 4,
          data: { nomi: "Respublika Markazi", viloyat: "Toshkent sh.", tuman: "Chilonzor", INN: "301122334" },
          mapped: { name: "Respublika Markazi", inn: "301122334" },
          status: "duplicate",
          messages: ["INN bo'yicha takrorlanish (qator 1 bilan)"]
        }
      ];
      setPreviewRows(mockRows);
      setParsing(false);
      setStep(4);
    }, 1200);
  };

  const handleStartImport = () => {
    setStep(5);
  };

  const runImport = () => {
    setProgress(1);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setFinalStatus({
            total: 152,
            created: 140,
            updated: 8,
            failed: 4,
            warnings: 12
          });
          setStep(6);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const renderStep1 = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {['Tibbiyot muassasalari', 'Dorixonalar', 'Klinikalar', 'Shifoxonalar', 'Laboratoriyalar', 'Boshqa obyektlar'].map((type) => (
        <Card 
          key={type} 
          className={cn(
            "cursor-pointer hover:border-primary transition-all",
            importType === type && "border-primary bg-primary/5 ring-1 ring-primary"
          )}
          onClick={() => setImportType(type)}
        >
          <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
            <Database className={cn("h-8 w-8", importType === type ? "text-primary" : "text-muted-foreground")} />
            <div className="font-semibold">{type}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderStep2 = () => (
    <div 
      className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed rounded-xl p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer"
      onClick={() => setFile({ name: 'toshkent_tibbiyot.xlsx', size: 102400 } as File)}
    >
      <Upload className="h-12 w-12 text-slate-400 mb-4" />
      <h3 className="text-lg font-bold">Faylni yuklang</h3>
      <p className="text-sm text-slate-500 mb-6">CSV, Excel, GeoJSON yoki JSON formatdagi fayllarni torting yoki bosing</p>
      {file && (
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm w-full max-w-md animate-in fade-in slide-in-from-bottom-2">
          <FileText className="h-8 w-8 text-blue-500" />
          <div className="text-left flex-1">
            <p className="text-sm font-bold truncate">{file.name}</p>
            <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB • XLSX detected</p>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Tayyor
          </Badge>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">Ustunlarni moslashtirish</h3>
          <p className="text-sm text-muted-foreground">Fayl ustunlarini tizim maydonlariga ulang</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {}}>
          <Settings2 className="mr-2 h-4 w-4" />
          Avtomatik moslashtirish
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[300px]">Tizim maydoni</TableHead>
              <TableHead>Fayl ustuni</TableHead>
              <TableHead className="w-[150px]">Holat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SYSTEM_FIELDS.map((field) => (
              <TableRow key={field.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{field.label}</span>
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Select 
                    value={mapping[field.id] || ''} 
                    onValueChange={(val) => setMapping(prev => ({ ...prev, [field.id]: val }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Tanlang..." />
                    </SelectTrigger>
                    <SelectContent>
                      {['nomi', 'viloyat', 'tuman', 'manzil', 'INN', 'lat', 'lon', 'tel', 'email', 'kadastr'].map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {mapping[field.id] ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                      Moslashtirildi
                    </Badge>
                  ) : (
                    field.required ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                        Kiritilmagan
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-slate-400">Majburiy emas</span>
                    )
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: 'Jami', val: previewRows.length, icon: LayoutList, color: 'text-slate-900' },
          { label: 'To\'g\'ri', val: previewRows.filter(r => r.status === 'valid').length, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Ogohlantirish', val: previewRows.filter(r => r.status === 'warning').length, icon: BadgeAlert, color: 'text-amber-600' },
          { label: 'Xatolik', val: previewRows.filter(r => r.status === 'error').length, icon: XCircle, color: 'text-red-600' },
          { label: 'Takroriy', val: previewRows.filter(r => r.status === 'duplicate').length, icon: HelpCircle, color: 'text-indigo-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-4 border flex flex-col gap-1">
            <stat.icon className={cn("h-4 w-4", stat.color)} />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold">{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Natijalardan qidirish..." className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Holat bo'yicha saralash
        </Button>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Nomi</TableHead>
                <TableHead>Hudud</TableHead>
                <TableHead>INN</TableHead>
                <TableHead>Koordinata</TableHead>
                <TableHead>Holat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row) => (
                <TableRow key={row.rowNumber} className={cn(row.status === 'error' && "bg-red-50/30", row.status === 'warning' && "bg-amber-50/30")}>
                  <TableCell className="text-center font-mono text-xs">{row.rowNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium text-xs">{row.mapped.name || row.data.nomi}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{row.data.manzil}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.mapped.region || '—'} / {row.mapped.district || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.mapped.inn || row.data.INN || '—'}</TableCell>
                  <TableCell className="text-xs">
                    {row.data.lat && row.data.lon ? `${row.data.lat.toFixed(3)}, ${row.data.lon.toFixed(3)}` : <span className="text-red-500">Mavjud emas</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {row.status === 'valid' && <Badge className="bg-emerald-600 w-fit">To'g'ri</Badge>}
                      {row.status === 'warning' && <Badge className="bg-amber-500 w-fit">Ogohlantirish</Badge>}
                      {row.status === 'error' && <Badge variant="destructive" className="w-fit">Xato</Badge>}
                      {row.status === 'duplicate' && <Badge variant="outline" className="border-indigo-500 text-indigo-600 w-fit">Takroriy</Badge>}
                      
                      {row.messages.map((m, i) => (
                        <p key={i} className="text-[9px] text-slate-500 italic">{m}</p>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex gap-4">
        <ShieldCheck className="h-8 w-8 text-blue-600 shrink-0" />
        <div className="space-y-2">
          <h4 className="font-bold text-blue-900">Importni tasdiqlash</h4>
          <p className="text-sm text-blue-700 leading-relaxed">
            Siz 152 ta yozuvni tizimga yuklash arafasidasiz. Ushbu amal audit tarixida saqlanadi. 
            Xatolik bor qatorlar (4 ta) import qilinmaydi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-widest text-slate-500">Import rejimi</Label>
          <RadioGroup value={importMode} onValueChange={(val: any) => setImportMode(val)} className="grid gap-3">
            <div className={cn("flex items-center space-x-3 space-y-0 p-4 rounded-xl border cursor-pointer", importMode === 'create' && "bg-slate-50 border-primary")}>
              <RadioGroupItem value="create" id="r1" />
              <Label htmlFor="r1" className="flex-1 cursor-pointer">
                <p className="font-bold text-sm">Faqat yangi yozuvlar</p>
                <p className="text-xs text-slate-500">Faqat yangi obyektlarni yaratadi</p>
              </Label>
            </div>
            <div className={cn("flex items-center space-x-3 space-y-0 p-4 rounded-xl border cursor-pointer", importMode === 'upsert_inn' && "bg-slate-50 border-primary")}>
              <RadioGroupItem value="upsert_inn" id="r2" />
              <Label htmlFor="r2" className="flex-1 cursor-pointer">
                <p className="font-bold text-sm">Mavjudlarini yangilash (INN bo'yicha)</p>
                <p className="text-xs text-slate-500">INN mos kelsa ma'lumotlarni yangilaydi</p>
              </Label>
            </div>
             <div className={cn("flex items-center space-x-3 space-y-0 p-4 rounded-xl border cursor-pointer", importMode === 'upsert_name' && "bg-slate-50 border-primary")}>
              <RadioGroupItem value="upsert_name" id="r3" />
              <Label htmlFor="r3" className="flex-1 cursor-pointer">
                <p className="font-bold text-sm">Nom va manzil bo'yicha yangilash</p>
                <p className="text-xs text-slate-500">Noaniqroq, lekin universal usul</p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-widest text-slate-500">Xulosa</Label>
          <Card className="bg-slate-50 border-none shadow-none">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Fayl:</span>
                <span className="font-bold">{file?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Yaratiladigan obyektlar:</span>
                <span className="font-bold text-emerald-600">140 ta</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Yangilanadigan:</span>
                <span className="font-bold text-blue-600">8 ta</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">O'tkazib yuboriladi (xato):</span>
                <span className="font-bold text-red-500">4 ta</span>
              </div>
              <div className="pt-3 border-t flex justify-between font-bold">
                <span>Jami muvaffaqiyatli:</span>
                <span>148 ta</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {progress > 0 && (
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Import jarayoni...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </div>
  );

  const renderStep6 = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-500">
      <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="h-12 w-12" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Import muvaffaqiyatli yakunlandi</h2>
      <p className="text-slate-500 max-w-md mb-10">
        Jami {finalStatus.total} ta qatordan {finalStatus.created} tasi muvaffaqiyatli qo'shildi va {finalStatus.updated} tasi yangilandi.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl mb-12">
        {[
          { label: 'Yaratildi', val: finalStatus.created, color: 'text-emerald-600' },
          { label: 'Yangilandi', val: finalStatus.updated, color: 'text-blue-600' },
          { label: 'Xato', val: finalStatus.failed, color: 'text-red-500' },
          { label: 'Ogohlantirish', val: finalStatus.warnings, color: 'text-amber-500' },
        ].map((item, i) => (
          <div key={i} className="bg-slate-50 p-4 rounded-xl border flex flex-col items-center">
            <span className="text-2xl font-bold mb-1">{item.val}</span>
            <span className="text-[10px] font-bold uppercase text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setStep(1)}>Yangi import</Button>
        <Button variant="outline">Audit tarixini ko'rish</Button>
        <Button onClick={() => window.location.href = '/admin/objects'}>
          Muassasalar ro'yxatiga o'tish
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">Import ustasi</CardTitle>
            <CardDescription>Obyektlarni fayldan yuklash va tizimga qo'shish</CardDescription>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div 
                key={s} 
                className={cn(
                  "h-1.5 w-8 rounded-full transition-all",
                  step >= s ? "bg-primary" : "bg-slate-200"
                )} 
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 min-h-[450px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
      </CardContent>
      {step < 6 && (
        <CardFooter className="flex justify-between border-t bg-slate-50/30 p-4">
          <Button 
            variant="ghost" 
            onClick={() => step > 1 && setStep((step - 1) as ImportStep)}
            disabled={step === 1 || progress > 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Ortga
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" disabled={progress > 0}>Bekor qilish</Button>
            
            {step === 1 && (
              <Button disabled={!importType} onClick={() => setStep(2)}>
                Davom etish
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <Button disabled={!file} onClick={() => setStep(3)}>
                Faylni tahlil qilish
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={validateRows} disabled={parsing}>
                {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Tekshirish va Preview
              </Button>
            )}
            {step === 4 && (
              <Button onClick={() => setStep(5)}>
                Importga o'tish
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 5 && (
              <Button onClick={runImport} disabled={progress > 0} className="bg-emerald-600 hover:bg-emerald-700">
                {progress > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                Importni boshlash
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}