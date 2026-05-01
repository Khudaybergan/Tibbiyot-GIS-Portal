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
  User, 
  History, 
  MapPin, 
  Terminal, 
  Globe, 
  ArrowRight, 
  Info,
  ShieldCheck,
  Code,
  Calendar,
  Monitor
} from "lucide-react";
import { AuditLog } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AuditDetailDrawerProps {
  log: AuditLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditDetailDrawer({ log, isOpen, onClose }: AuditDetailDrawerProps) {
  if (!log) return null;

  const renderDiff = () => {
    if (!log.before_data && !log.after_data) return null;

    const allKeys = Array.from(new Set([
      ...Object.keys(log.before_data || {}),
      ...Object.keys(log.after_data || {})
    ]));

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="h-4 w-4" /> O'zgarishlar tafsiloti
        </h4>
        <div className="space-y-2">
          {allKeys.map((key) => {
            const oldVal = log.before_data?.[key];
            const newVal = log.after_data?.[key];
            
            if (oldVal === newVal) return null;

            return (
              <div key={key} className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-4 items-start p-3 rounded-lg border bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">{key}</span>
                <div className="bg-red-50 p-2 rounded text-[11px] text-red-600 line-through decoration-red-300 min-h-[30px]">
                  {oldVal !== undefined ? String(oldVal) : '—'}
                </div>
                <div className="bg-emerald-50 p-2 rounded text-[11px] font-bold text-emerald-700 flex items-center gap-2 min-h-[30px]">
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  {newVal !== undefined ? String(newVal) : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="p-6 border-b bg-slate-50/50">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className={cn(
                "uppercase text-[10px]",
                log.severity === 'critical' ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-100"
            )}>
                {log.severity}
            </Badge>
            <Badge variant="secondary" className="uppercase text-[10px]">{log.entity_type}</Badge>
          </div>
          <SheetTitle className="text-xl font-bold">{log.action.replace(/_/g, ' ').toUpperCase()}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            ID: {log.id} • {log.created_at}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* Actor Info */}
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 border">
                <User className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{log.actor_email}</p>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5">{log.actor_role}</Badge>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Tomonidan bajarildi</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">IP Manzil</span>
                    <div className="flex items-center gap-2 text-xs font-mono">
                        <Globe className="h-3 w-3 text-slate-400" />
                        {log.ip_address}
                    </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Entity ID</span>
                    <div className="flex items-center gap-2 text-xs font-mono">
                        <Terminal className="h-3 w-3 text-slate-400" />
                        {log.entity_id}
                    </div>
                </div>
            </div>

            {/* Diff */}
            {renderDiff()}

            {/* Metadata */}
            {log.metadata && (
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Code className="h-4 w-4" /> Qo'shimcha ma'lumotlar
                    </h4>
                    <pre className="bg-slate-900 text-blue-300 p-4 rounded-xl text-[10px] overflow-x-auto font-mono">
                        {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                </div>
            )}

            {/* Browser info */}
            <div className="bg-slate-50 p-4 rounded-xl border flex gap-3">
                <Monitor className="h-5 w-5 text-slate-400 shrink-0" />
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Browser / Agent</p>
                    <p className="text-[10px] text-slate-600 font-mono leading-relaxed italic">{log.user_agent}</p>
                </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t bg-slate-50/30">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Yopish
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}