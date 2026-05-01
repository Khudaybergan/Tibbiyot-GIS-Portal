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
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  History,
  ArrowRightLeft,
  CalendarDays,
  UserCheck
} from "lucide-react";
import { ObjectChangeRequest, RequestStatus, RequestType, RequestPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { RequestDetailDrawer } from "./request-detail-drawer";

interface ModerationTableProps {
  requests: ObjectChangeRequest[];
}

export function ModerationTable({ requests }: ModerationTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<ObjectChangeRequest | null>(null);

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "approved": return <Badge className="bg-emerald-600">Tasdiqlangan</Badge>;
      case "pending": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Kutilmoqda</Badge>;
      case "rejected": return <Badge variant="destructive">Rad etilgan</Badge>;
      case "needs_changes": return <Badge variant="outline" className="border-indigo-500 text-indigo-600">Tuzatish kutilmoqda</Badge>;
      case "cancelled": return <Badge variant="secondary">Bekor qilingan</Badge>;
    }
  };

  const getTypeBadge = (type: RequestType) => {
    switch (type) {
      case "create": return <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50/50">Yaratish</Badge>;
      case "update": return <Badge variant="outline" className="border-purple-500 text-purple-600 bg-purple-50/50">Tahrir</Badge>;
      case "archive": return <Badge variant="outline" className="border-slate-500 text-slate-600 bg-slate-50/50">Arxiv</Badge>;
      case "delete": return <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50/50">O'chirish</Badge>;
      case "restore": return <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50/50">Tiklash</Badge>;
    }
  };

  const getPriorityColor = (p: RequestPriority) => {
    switch (p) {
      case 'high': return 'text-orange-600 font-bold';
      case 'normal': return 'text-slate-600';
      case 'low': return 'text-slate-400';
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[200px]">Muassasa</TableHead>
            <TableHead>Turi</TableHead>
            <TableHead>Holat</TableHead>
            <TableHead>So'rovchi</TableHead>
            <TableHead>Hudud</TableHead>
            <TableHead>Sana</TableHead>
            <TableHead>Ustuvorlik</TableHead>
            <TableHead className="text-right">Amallar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((item) => (
            <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedRequest(item)}>
              <TableCell>
                <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[180px]" title={item.object_name}>
                  {item.object_name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{item.id}</div>
              </TableCell>
              <TableCell>{getTypeBadge(item.type)}</TableCell>
              <TableCell>{getStatusBadge(item.status)}</TableCell>
              <TableCell>
                <div className="text-[11px] font-medium text-slate-700">{item.requested_by_name}</div>
                <div className="text-[9px] text-slate-400 uppercase tracking-tighter">{item.requested_by_role}</div>
              </TableCell>
              <TableCell>
                <div className="text-[11px] text-slate-600">{item.region}</div>
                <div className="text-[10px] text-slate-400">{item.district}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <CalendarDays className="h-3 w-3 text-slate-300" />
                  {item.created_at.split(' ')[0]}
                </div>
                <div className="text-[10px] text-slate-400 pl-4.5">{item.created_at.split(' ')[1]}</div>
              </TableCell>
              <TableCell>
                <div className={cn("text-[11px] uppercase tracking-wider", getPriorityColor(item.priority))}>
                  {item.priority === 'high' ? '!!! ' : ''}{item.priority}
                </div>
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Moderatsiya</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setSelectedRequest(item)}>
                      <Eye className="mr-2 h-4 w-4" /> Ko'rish va taqqoslash
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-emerald-600"><CheckCircle2 className="mr-2 h-4 w-4" /> Tasdiqlash</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600"><XCircle className="mr-2 h-4 w-4" /> Rad etish</DropdownMenuItem>
                    <DropdownMenuItem className="text-indigo-600"><AlertCircle className="mr-2 h-4 w-4" /> Tuzatish so'rash</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem><UserCheck className="mr-2 h-4 w-4" /> Audit tarixi</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RequestDetailDrawer 
        request={selectedRequest} 
        isOpen={!!selectedRequest} 
        onClose={() => setSelectedRequest(null)} 
      />
    </div>
  );
}
