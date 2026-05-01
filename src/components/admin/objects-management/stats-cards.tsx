import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, CheckCircle, Clock, Archive, AlertCircle } from "lucide-react";

export function StatsCards() {
  const stats = [
    {
      title: "Jami muassasalar",
      value: "1,250",
      icon: Database,
      description: "Tizimdagi barcha obyektlar",
      color: "text-blue-600",
    },
    {
      title: "Faol",
      value: "1,120",
      icon: CheckCircle,
      description: "Xaritada ko'rsatilmoqda",
      color: "text-green-600",
    },
    {
      title: "Moderatsiyada",
      value: "45",
      icon: Clock,
      description: "Tasdiqlash kutilmoqda",
      color: "text-amber-600",
    },
    {
      title: "Arxivlangan",
      value: "72",
      icon: Archive,
      description: "Tizimdan o'chirilgan",
      color: "text-gray-600",
    },
    {
      title: "Xatolik bor",
      value: "13",
      icon: AlertCircle,
      description: "Koordinata yoki ma'lumotda xato",
      color: "text-red-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat, index) => (
        <Card key={index} className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
