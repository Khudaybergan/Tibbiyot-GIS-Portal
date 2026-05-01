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
  Edit, 
  Map as MapIcon, 
  Archive, 
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileEdit,
  Trash2
} from "lucide-react";
import { MedicalObject, CoordinateStatus, ModerationStatus, ActivityStatus } from "@/lib/types";
import Link from "next/link";

interface DataTableProps {
  data: MedicalObject[];
}

export function DataTable({ data }: DataTableProps) {
  const getCoordinateBadge = (status: CoordinateStatus) => {
    switch (status) {
      case "valid": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="mr-1 h-3 w-3" /> Mavjud</Badge>;
      case "missing": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="mr-1 h-3 w-3" /> Yo'q</Badge>;
      case "invalid": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><XCircle className="mr-1 h-3 w-3" /> Xato</Badge>;
      case "outside_uzbekistan": return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Xorij</Badge>;
      case "unconfirmed": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Kutilmoqda</Badge>;
    }
  };

  const getModerationBadge = (status: ModerationStatus) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-600">Tasdiqlangan</Badge>;
      case "pending_review": return <Badge variant="secondary" className="bg-amber-100 text-amber-800"><Clock className="mr-1 h-3 w-3" /> Kutilmoqda</Badge>;
      case "draft": return <Badge variant="outline">Qoralama</Badge>;
      case "rejected": return <Badge variant="destructive">Rad etilgan</Badge>;
      case "needs_changes": return <Badge variant="outline" className="border-amber-500 text-amber-600"><FileEdit className="mr-1 h-3 w-3" /> Tuzatish</Badge>;
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="font-bold">Nomi</TableHead>
            <TableHead>Turi / Mulk</TableHead>
            <TableHead>Hudud</TableHead>
            <TableHead>INN</TableHead>
            <TableHead>Koordinata</TableHead>
            <TableHead>Moderatsiya</TableHead>
            <TableHead>Holat</TableHead>
            <TableHead className="text-right">Amallar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-64 text-center text-muted-foreground">
                Muassasalar topilmadi.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="max-w-[250px]">
                  <div className="font-semibold text-foreground truncate" title={item.name}>{item.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{item.address}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs">{item.type}</div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase">{item.ownership}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs">{item.region}</div>
                  <div className="text-[10px] text-muted-foreground">{item.district}</div>
                </TableCell>
                <TableCell className="font-mono text-xs">{item.inn}</TableCell>
                <TableCell>{getCoordinateBadge(item.coordinateStatus)}</TableCell>
                <TableCell>{getModerationBadge(item.moderationStatus)}</TableCell>
                <TableCell>
                   <Badge variant={item.activityStatus === "active" ? "outline" : "secondary"} className={item.activityStatus === "active" ? "text-green-600 border-green-200 bg-green-50/50" : ""}>
                    {item.activityStatus === "active" ? "Faol" : "Arxiv"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Amallar</DropdownMenuLabel>
                      <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> Ko'rish</DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/objects/${item.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" /> Tahrirlash
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem><MapIcon className="mr-2 h-4 w-4" /> Xaritada ko'rish</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-amber-600"><Archive className="mr-2 h-4 w-4" /> Arxivlash so'rovi</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> O'chirish so'rovi</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem><History className="mr-2 h-4 w-4" /> Auditni ko'rish</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between p-4 border-t bg-muted/20">
        <div className="text-xs text-muted-foreground">
          Jami <b>{data.length}</b> tadan <b>1-6</b> ko'rsatilmoqda
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Oldingi</Button>
          <Button variant="outline" size="sm" disabled>Keyingi</Button>
        </div>
      </div>
    </div>
  );
}
