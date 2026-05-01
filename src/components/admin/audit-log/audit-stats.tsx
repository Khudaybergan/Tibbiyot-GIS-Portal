import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ShieldAlert, FileUp, ListChecks, UserCheck, Clock } from "lucide-react";
import { AuditLog } from "@/lib/types";

interface AuditStatsProps {
  logs: AuditLog[];
}

export function AuditStats({ logs }: AuditStatsProps) {
  const stats = [
    {
      title: "Jami amallar",
      value: "4,250",
      icon: Activity,
      description: "Barcha qayd etilgan amallar",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Bugungi amallar",
      value: logs.length.toString(),
      icon: Clock,
      description: "Oxirgi 24 soat ichida",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Xavfli amallar",
      value: "12",
      icon: ShieldAlert,
      description: "Tanqidiy o'zgarishlar",
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Importlar",
      value: "85",
      icon: FileUp,
      description: "Fayldan va Exceldan yuklamalar",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Moderatsiya",
      value: "320",
      icon: ListChecks,
      description: "Tasdiqlash va rad etishlar",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Foydalanuvchi",
      value: "45",
      icon: UserCheck,
      description: "Rol va profil amallari",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat, i) => (
        <Card key={i} className="border-none shadow-sm overflow-hidden">
          <CardHeader className={`${stat.bg} py-3`}>
            <div className="flex items-center justify-between">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {stat.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-[10px] text-slate-400 mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}