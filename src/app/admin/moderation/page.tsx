'use client';

import { ModerationStats } from "@/components/admin/moderation/moderation-stats";
import { ModerationFilters } from "@/components/admin/moderation/moderation-filters";
import { ModerationTable } from "@/components/admin/moderation/moderation-table";
import { mockChangeRequests } from "@/lib/admin/moderation-data";

export default function ModerationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Moderatsiya</h1>
        <p className="text-sm text-slate-500">
          Muassasa ma’lumotlari bo‘yicha so‘rovlar va o‘zgarishlarni tekshirish hamda tasdiqlash
        </p>
      </div>

      <ModerationStats requests={mockChangeRequests} />

      <ModerationFilters />

      <ModerationTable requests={mockChangeRequests} />
    </div>
  );
}
