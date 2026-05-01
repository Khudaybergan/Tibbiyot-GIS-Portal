'use client';

import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  User, 
  History, 
  Building2, 
  MapPin, 
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Info,
  Send,
  Loader2
} from "lucide-react";
import { ObjectChangeRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface RequestDetailDrawerProps {
  request: ObjectChangeRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RequestDetailDrawer({ request, isOpen, onClose }: RequestDetailDrawerProps) {
  const { toast } = useToast();
  const [isActing, setIsActing] = useState(false);

  if (!request) return null;

  const handleAction = async (action: 'approve' | 'reject' | 'changes') => {
    setIsActing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let title = "";
    if (action === 'approve') title = "So'rov tasdiqlandi";
    if (action === 'reject') title = "So'rov rad etildi";
    if (action === 'changes') title = "Tuzatish so'raldi";

    toast({ title });
    setIsActing(false);
    onClose();
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'high': return <Badge variant="destructive" className="bg-orange-500">Yuqori</Badge>;
      case 'normal': return <Badge variant="outline" className="border-blue-500 text-blue-600">O'rta</Badge>;
      case 'low': return <Badge variant="outline">Past</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'create': return <Badge className="bg-blue-600 uppercase text-[10px]">Yangi</Badge>;
      case 'update': return <Badge className="bg-purple-600 uppercase text-[10px]">Tahrir</Badge>;
      case 'archive': return <Badge className="bg-slate-600 uppercase text-[10px]">Arxiv</Badge>;
      case 'delete': return <Badge variant="destructive" className="uppercase text-[10px]">O'chirish</Badge>;
      case 'restore': return <Badge className="bg-emerald-600 uppercase text-[10px]">Tiklash</Badge>;
    }
  };

  const renderDiff = () => {
    if (request.type === 'create') {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Yangi muassasa ma'lumotlari
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              {Object.entries(request.after_data).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <span className="text-slate-400 font-medium uppercase tracking-tighter">{key}:</span>
                  <div className="font-bold text-slate-700">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (request.type === 'update' && request.before_data) {
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="h-4 w-4" /> O'zgarishlar tarixi
          </h4>
          <div className="space-y-3">
            {Object.keys(request.after_data).map((key) => {
              const oldVal = (request.before_data as any)[key];
              const newVal = (request.after_data as any)[key];
              
              return (
                <div key={key} className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-4 items-start p-3 rounded-lg border bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">{key}</span>
                  <div className="bg-red-50 p-2 rounded text-[11px] line-through text-red-600 decoration-red-300">
                    {typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal || '—')}
                  </div>
                  <div className="bg-emerald-50 p-2 rounded text-[11px] font-bold text-emerald-700 flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-slate-50 rounded-xl border border-dashed flex flex-col items-center gap-3 text-center">
        <Info className="h-8 w-8 text-slate-400" />
        <p className="text-sm text-slate-500">
          Ushbu so'rov muassasani {request.type === 'archive' ? 'arxivlash' : request.type === 'delete' ? "o'chirish" : 'tiklash'}ga qaratilgan.
        </p>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="p-6 border-b bg-slate-50/50">
          <div className="flex items-center gap-3 mb-2">
            {getTypeBadge(request.type)}
            {getPriorityBadge(request.priority)}
          </div>
          <SheetTitle className="text-xl font-bold">{request.object_name}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            ID: {request.id} • So'rov yuborilgan: {request.created_at}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* Requester Info */}
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{request.requested_by_name}</p>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5">{request.requested_by_role}</Badge>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Tomonidan yuborildi</span>
                </div>
                <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100 italic text-xs text-slate-600">
                  "{request.reason}"
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Comparison */}
            {renderDiff()}

            {/* Map Preview Placeholder */}
            {(request.after_data.position || (request.before_data && request.before_data.position)) && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Joylashuvni tekshirish
                </h4>
                <div className="h-48 w-full bg-slate-200 rounded-xl flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/10" />
                  <MapPin className="h-8 w-8 text-blue-600 relative z-10 animate-bounce" />
                  <p className="absolute bottom-3 left-3 z-10 text-[10px] font-mono bg-white/90 px-2 py-1 rounded border shadow-sm">
                    {JSON.stringify(request.after_data.position || (request.before_data && request.before_data.position))}
                  </p>
                  <Button variant="outline" size="sm" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Xaritada ko'rish
                  </Button>
                </div>
              </div>
            )}

            {/* Admin Comment History */}
            {request.admin_comment && (
               <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                 <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold text-amber-700 uppercase">Oldingi admin izohi</p>
                    <p className="text-xs text-amber-900 italic leading-relaxed">{request.admin_comment}</p>
                 </div>
               </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t bg-slate-50/30 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            className="w-full"
            disabled={isActing}
            onClick={() => handleAction('changes')}
          >
            Tuzatish
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={isActing}
            onClick={() => handleAction('reject')}
          >
            Rad etish
          </Button>
          <Button 
            className="w-full sm:col-span-1 col-span-2 bg-blue-600 hover:bg-blue-700"
            disabled={isActing}
            onClick={() => handleAction('approve')}
          >
            {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Tasdiqlash
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
