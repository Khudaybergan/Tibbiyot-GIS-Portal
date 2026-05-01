"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  X, 
  Send, 
  MapPin, 
  Building2, 
  FileText, 
  Info, 
  Clock, 
  User,
  History,
  AlertTriangle,
  CheckCircle2,
  FileClock,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Navigation
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { LocationSelectorMap } from "./location-selector-map";
import { AttachmentUploadBox } from "./attachment-upload-box";
import { adminRegions } from "@/lib/admin/regions-data";
import { useToast } from "@/hooks/use-toast";
import type { MedicalObject, CoordinateStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const UZBEKISTAN_BOUNDS = {
  latMin: 37.0,
  latMax: 45.7,
  lngMin: 55.8,
  lngMax: 73.3
};

const formSchema = z.object({
  name: z.string().min(3, "Muassasa nomi kamida 3 ta belgidan iborat bo'lishi kerak"),
  type: z.string().min(1, "Muassasa turini tanlang"),
  ownership: z.enum(["Davlat", "Xususiy", "Aralash", "Noma’lum"]),
  inn: z.string().regex(/^\d{9}$/, "INN 9 ta raqamdan iborat bo'lishi kerak"),
  phone: z.string().min(7, "Telefon raqami kiritilishi shart"),
  license_number: z.string().optional(),
  email: z.string().email("Noto'g'ri email format").optional().or(z.literal("")),
  website: z.string().url("Noto'g'ri URL format").optional().or(z.literal("")),
  region: z.string().min(1, "Viloyatni tanlang"),
  district: z.string().min(1, "Tumanni tanlang"),
  mahalla: z.string().min(1, "Mahalla kiritilishi shart"),
  address: z.string().min(5, "Aniq manzilni kiritish shart"),
  postal_code: z.string().optional(),
  lat: z.number({ required_error: "Xaritadan joylashuvni tanlang" }),
  lng: z.number({ required_error: "Xaritadan joylashuvni tanlang" }),
  work_hours: z.string().optional(),
  director_name: z.string().optional(),
  responsible_person: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InstitutionFormProps {
  initialData?: MedicalObject;
  mode: "create" | "edit";
}

export function InstitutionForm({ initialData, mode }: InstitutionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoordinateConfirmed, setIsCoordinateConfirmed] = useState(initialData?.coordinateStatus === "valid");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      type: initialData.type,
      ownership: initialData.ownership,
      inn: initialData.inn,
      license_number: initialData.license_number,
      phone: initialData.phone,
      email: initialData.email,
      website: initialData.website,
      region: initialData.region,
      district: initialData.district,
      mahalla: initialData.mahalla,
      address: initialData.address,
      postal_code: initialData.postal_code,
      lat: initialData.position.lat,
      lng: initialData.position.lng,
      work_hours: initialData.work_hours,
      director_name: initialData.director_name,
      responsible_person: initialData.responsible_person,
      notes: initialData.notes,
      source: initialData.source,
    } : {
      name: "",
      type: "",
      ownership: "Davlat",
      inn: "",
      phone: "",
      region: "",
      district: "",
      mahalla: "",
      address: "",
    },
  });

  const selectedRegionName = form.watch("region");
  const selectedDistrictName = form.watch("district");
  const lat = form.watch("lat");
  const lng = form.watch("lng");

  // Reset confirmation if coordinates change
  useEffect(() => {
    setIsCoordinateConfirmed(false);
  }, [lat, lng]);

  const districts = useMemo(() => {
    return adminRegions.find(r => r.name === selectedRegionName)?.districts || [];
  }, [selectedRegionName]);

  const coordinateStatus: CoordinateStatus = useMemo(() => {
    if (!lat || !lng) return "missing";
    const isOutside = lat < UZBEKISTAN_BOUNDS.latMin || lat > UZBEKISTAN_BOUNDS.latMax || 
                     lng < UZBEKISTAN_BOUNDS.lngMin || lng > UZBEKISTAN_BOUNDS.lngMax;
    
    if (isOutside) return "outside_uzbekistan";
    if (isCoordinateConfirmed) return "valid";
    return "unconfirmed";
  }, [lat, lng, isCoordinateConfirmed]);

  const onSubmit = async (status: "save" | "draft" | "moderation") => {
    const values = form.getValues();

    // Strict validation for non-drafts
    if (status !== "draft") {
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          variant: "destructive",
          title: "Xatolik",
          description: "Iltimos, barcha majburiy maydonlarni to'g'ri to'ldiring.",
        });
        return;
      }

      if (coordinateStatus === "missing") {
        toast({
          variant: "destructive",
          title: "Koordinata xatosi",
          description: "Xaritadan muassasa joylashuvini tanlang.",
        });
        return;
      }

      if (coordinateStatus === "outside_uzbekistan") {
        toast({
          variant: "destructive",
          title: "Koordinata xatosi",
          description: "Koordinata O'zbekiston hududidan tashqarida.",
        });
        return;
      }

      if (coordinateStatus === "unconfirmed") {
        toast({
          variant: "destructive",
          title: "Tasdiqlash shart",
          description: "Koordinatani saqlashdan oldin tasdiqlang.",
        });
        return;
      }
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: status === "draft" ? "Qoralama saqlandi" : "Muvaffaqiyatli saqlandi",
      description: `${values.name} ma'lumotlari yangilandi.`,
    });
    
    setIsSubmitting(false);
    router.push("/admin/objects");
  };

  const handleClearMarker = () => {
    form.setValue("lat", undefined as any);
    form.setValue("lng", undefined as any);
    setIsCoordinateConfirmed(false);
  };

  return (
    <Form {...form}>
      <form className="space-y-8 pb-20" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Asosiy ma'lumotlar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Muassasa nomi <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Masalan: Respublika markaziy shifoxonasi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Muassasa turi <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Tanlang" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Shifoxona">Shifoxona</SelectItem>
                            <SelectItem value="Poliklinika">Poliklinika</SelectItem>
                            <SelectItem value="Klinika">Klinika</SelectItem>
                            <SelectItem value="Dorixona">Dorixona</SelectItem>
                            <SelectItem value="Laboratoriya">Laboratoriya</SelectItem>
                            <SelectItem value="Diagnostika markazi">Diagnostika markazi</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ownership"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mulk shakli <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Tanlang" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Davlat">Davlat</SelectItem>
                            <SelectItem value="Xususiy">Xususiy</SelectItem>
                            <SelectItem value="Aralash">Aralash</SelectItem>
                            <SelectItem value="Noma’lum">Noma’lum</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>INN (STIR) <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="+998 71 123 45 67" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="license_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Litsenziya raqami</FormLabel>
                        <FormControl>
                          <Input placeholder="L-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="example@mail.uz" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Veb-sayt</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  Joylashuv ma'lumotlari
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Viloyat <span className="text-red-500">*</span></FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue("district", "");
                            form.setValue("mahalla", "");
                          }} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Tanlang" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {adminRegions.map(r => (
                              <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tuman <span className="text-red-500">*</span></FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            field.onChange(val);
                            form.setValue("mahalla", "");
                          }} 
                          defaultValue={field.value}
                          disabled={!selectedRegionName}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedRegionName ? "Tanlang" : "Avval viloyatni tanlang"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {districts.map(d => (
                              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mahalla"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mahalla <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Mahalla nomi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aniq manzil <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Ko'cha nomi, uy raqami" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Xaritadan joylashuvni tanlash</h4>
                      <p className="text-[11px] text-slate-500">GIS tizimi uchun muassasa koordinatasini tasdiqlash shart</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {coordinateStatus === "valid" && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-1">
                          <CheckCircle2 className="h-3 w-3" /> Tasdiqlangan
                        </Badge>
                      )}
                      {coordinateStatus === "unconfirmed" && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 py-1">
                          <AlertTriangle className="h-3 w-3" /> Tasdiqlanmagan
                        </Badge>
                      )}
                      {coordinateStatus === "outside_uzbekistan" && (
                        <Badge variant="destructive" className="gap-1.5 py-1">
                          <AlertTriangle className="h-3 w-3" /> Hududdan tashqarida
                        </Badge>
                      )}
                      {coordinateStatus === "missing" && (
                        <Badge variant="secondary" className="gap-1.5 py-1">
                          Tanlanmagan
                        </Badge>
                      )}
                    </div>
                  </div>

                  <LocationSelectorMap 
                    lat={lat} 
                    lng={lng} 
                    onLocationSelect={(newLat, newLng) => {
                      form.setValue("lat", newLat);
                      form.setValue("lng", newLng);
                      setIsCoordinateConfirmed(false);
                    }}
                    isInvalid={coordinateStatus === "outside_uzbekistan"}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-slate-50 p-4">
                    <div className="flex gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kenglik (Latitude)</p>
                        <p className="text-sm font-mono font-bold text-slate-700">{lat?.toFixed(6) || "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uzunlik (Longitude)</p>
                        <p className="text-sm font-mono font-bold text-slate-700">{lng?.toFixed(6) || "—"}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        disabled={!lat || !lng}
                        onClick={handleClearMarker}
                        className="text-slate-500 hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Tozalash
                      </Button>
                      
                      {coordinateStatus !== "valid" ? (
                        <Button 
                          type="button" 
                          variant="default" 
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={!lat || !lng || coordinateStatus === "outside_uzbekistan"}
                          onClick={() => setIsCoordinateConfirmed(true)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Koordinatani tasdiqlash
                        </Button>
                      ) : (
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm"
                          onClick={() => setIsCoordinateConfirmed(false)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Tasdiqni bekor qilish
                        </Button>
                      )}
                    </div>
                  </div>

                  {form.formState.errors.lat && (
                    <p className="text-[11px] font-medium text-destructive mt-2">
                      <AlertTriangle className="inline-block mr-1 h-3 w-3" />
                      {form.formState.errors.lat.message}
                    </p>
                  )}
                  
                  {coordinateStatus === "outside_uzbekistan" && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 mt-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Xatolik: Koordinata O'zbekiston hududidan tashqarida. Iltimos, nuqtani xarita ichiga joylang.</span>
                    </div>
                  )}

                  {(selectedRegionName || selectedDistrictName) && lat && lng && !isCoordinateConfirmed && (
                     <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-700 border border-amber-100">
                      <Info className="h-4 w-4" />
                      <span>Hudud ma'lumotlari o'zgargan yoki yangi nuqta tanlangan bo'lishi mumkin. Tasdiqlashni bosing.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Extra Info */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-5 w-5 text-indigo-600" />
                  Qo'shimcha ma'lumotlar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="work_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Ish vaqti</FormLabel>
                        <FormControl>
                          <Input placeholder="Dush-Shan: 09:00 - 18:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="director_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Rahbar F.I.O.</FormLabel>
                        <FormControl>
                          <Input placeholder="Rahbar ismi sharifi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Izohlar / Qo'shimcha eslatmalar</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Muassasa haqida qo'shimcha ma'lumotlar..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-600" />
                  Hujjatlar va fayllar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <AttachmentUploadBox />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm sticky top-6">
              <CardHeader className="bg-slate-50 border-b py-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Forma holati
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Xarita koordinatasi</span>
                    {coordinateStatus === "valid" ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Tasdiqlangan
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {coordinateStatus === "missing" ? "Tanlanmagan" : "Tasdiqlanmagan"}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Majburiy maydonlar</span>
                    <span className="text-slate-900 font-bold">12 / 12</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Moderatsiya holati</span>
                    <span className="text-blue-600 font-bold flex items-center gap-1 uppercase tracking-tighter">
                      <FileClock className="h-3 w-3" /> Yangi
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <Button 
                    type="button" 
                    className="w-full bg-blue-600 hover:bg-blue-700 shadow-md"
                    disabled={isSubmitting}
                    onClick={() => onSubmit("save")}
                  >
                    {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
                    {!isSubmitting && <Save className="ml-2 h-4 w-4" />}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={() => onSubmit("draft")}
                  >
                    Qoralama sifatida saqlash
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={() => onSubmit("moderation")}
                  >
                    Moderatsiyaga yuborish
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full text-slate-500"
                    onClick={() => router.push("/admin/objects")}
                  >
                    Bekor qilish
                  </Button>
                </div>

                <div className="pt-6 border-t">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Audit tarixi</h5>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <History className="h-3 w-3 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-700 leading-tight">Muassasa yaratish jarayoni</p>
                        <p className="text-[9px] text-slate-400">Bugun, {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} • Admin</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 text-slate-50 overflow-hidden">
               <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-bold">Ma'lumot xavfsizligi</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Ushbu ma'lumotlar davlat tibbiyot GIS portaliga kiritiladi. Koordinatalar tasdiqlangan bo'lishi shart.
                  </p>
               </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
