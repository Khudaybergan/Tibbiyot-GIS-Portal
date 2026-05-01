'use client';

import { DashboardCards } from "@/components/admin/dashboard-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartData = [
  { month: "Yanvar", total: 186 },
  { month: "Fevral", total: 305 },
  { month: "Mart", total: 237 },
  { month: "Aprel", total: 173 },
  { month: "May", total: 209 },
  { month: "Iyun", total: 214 },
];

const chartConfig = {
  total: {
    label: "Obyektlar",
    color: "hsl(var(--primary))",
  },
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Boshqaruv paneli</h1>
        <p className="text-muted-foreground">
          Tibbiyot GIS portali statistikasi va holatiga umumiy ko'rinish.
        </p>
      </div>
      <DashboardCards />
      <Card>
        <CardHeader>
          <CardTitle>Yangi obyektlar dinamikasi</CardTitle>
          <CardDescription>Oxirgi 6 oy ichida qo'shilgan obyektlar soni</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              <Bar dataKey="total" fill="var(--color-total)" radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
