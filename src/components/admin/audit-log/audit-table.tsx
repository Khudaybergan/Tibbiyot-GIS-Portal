'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Eye, 
  History,
  Terminal,
  ExternalLink,
  ShieldAlert,
  ShieldInfo,
  ShieldQuestion
} from "lucide-react";
import { AuditLog, AuditLogAction, AuditLogSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AuditDetailDrawer } from "./audit-detail-drawer";

interface AuditTableProps {
  logs: AuditLog[];
}

export function AuditTable({ logs }: AuditTableProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const getSeverityBadge = (s: AuditLogSeverity) => {
    switch (s) {
      case 'info': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">Info</Badge>;
      case 'warning': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 text-[10px]">Warning</Badge>;
      case 'critical': return <Badge variant="destructive" className="text-[10px] bg-red-600">Critical</Badge>;
    }
  };

  const getActionLabel = (action: AuditLogAction) => {
    const labels: Record<string, string> = {
      object_created: "Obyekt yaratildi",
      object_updated: "Obyekt tahrirlandi",
      object_archived: "Obyekt arxivlandi",
      object_deleted: "Obyekt o'chirildi",
      import_completed: "Import yakunlandi",
      role_assigned: "Rol tayinlandi",
      role_revoked: "Rol olib tashlandi",
      change_request_approved: "So'rov tasdiqlandi",
      login: "Tizimga kirish"
    };
    return labels[action] || action;
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'medical_object': return <History className="h-3 w-3 text-blue-500" />;
      case 'user': return <Terminal className="h-3 w-3 text-purple-500" />;
      default: return <History className="h-3 w-3 text-slate-400" />;
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[180px]">Vaqt</TableHead>
            <TableHead>Foydalanuvchi</TableHead>
            <TableHead>Amal</TableHead>
            <TableHead>Entity / Nomi</TableHead>
            <TableHead>IP Manzil</TableHead>
            <TableHead>Daraja</TableHead>
            <TableHead className="text-right">Amallar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedLog(log)}>
              <TableCell>
                <div className="text-[11px] font-medium text-slate-900">{log.created_at.split(' ')[0]}</div>
                <div className="text-[10px] text-slate-400">{log.created_at.split(' ')[1]}</div>
              </TableCell>
              <TableCell>
                <div className="text-[11px] font-bold text-slate-700">{log.actor_email}</div>
                <div className="text-[9px] text-slate-400 uppercase tracking-tighter">{log.actor_role}</div>
              </TableCell>
              <TableCell>
                <div className="text-[11px] text-slate-700 font-medium">{getActionLabel(log.action)}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getEntityIcon(log.entity_type)}
                  <div>
                    <div className="text-[11px] font-bold text-slate-800 truncate max-w-[150px]" title={log.entity_name}>
                        {log.entity_name}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase">{log.entity_type}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{log.ip_address}</code>
              </TableCell>
              <TableCell>{getSeverityBadge(log.severity)}</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Audit amallari</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setSelectedLog(log)}>
                      <Eye className="mr-2 h-4 w-4" /> Batafsil ko'rish
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <ExternalLink className="mr-2 h-4 w-4" /> Obyektni ochish
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AuditDetailDrawer 
        log={selectedLog} 
        isOpen={!!selectedLog} 
        onClose={() => setSelectedLog(null)} 
      />
    </div>
  );
}