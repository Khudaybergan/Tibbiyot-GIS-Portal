import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, XCircle, AlertTriangle, ListChecks, ArrowUpRight } from "lucide-react";
import { ObjectChangeRequest } from "@/lib/types";

interface ModerationStatsProps {
  requests: ObjectChangeRequest[];
}

export function ModerationStats({ requests }: ModerationStatsProps) {
  const stats = [
    {
      title: "Jami so'rovlar",
      value: requests.length,
      icon: ListChecks,
      description: "Barcha moderation so'rovlari",
      color: "text-slate-600",
      bg: "bg-slate-50",
    },
    {
      title: "Kutilmoqda",
      value: requests.filter(r => r.status === 'pending').length,
      icon: Clock,
      description: "Ko'rib chiqilishi kerak",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Tasdiqlangan",
      value: requests.filter(r => r.status === 'approved').length,
      icon: CheckCircle2,
      description: "Tizimga tatbiq etilgan",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Rad etilgan",
      value: requests.filter(r => r.status === 'rejected').length,
      icon: XCircle,
      description: "Rad qilingan so'rovlar",
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "O'zgartirish kerak",
      value: requests.filter(r => r.status === 'needs_changes').length,
      icon: AlertTriangle,
      description: "Qayta ishlanmoqda",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Yuqori ustuvorlik",
      value: requests.filter(r => r.priority === 'high' && r.status === 'pending').length,
      icon: ArrowUpRight,
      description: "Shoshilinch ko'riladi",
      color: "text-orange-600",
      bg: "bg-orange-50",
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
