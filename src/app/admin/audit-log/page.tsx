'use client';

import { AuditStats } from "@/components/admin/audit-log/audit-stats";
import { AuditFilters } from "@/components/admin/audit-log/audit-filters";
import { AuditTable } from "@/components/admin/audit-log/audit-table";
import { mockAuditLogs } from "@/lib/admin/audit-data";

export default function AuditLogPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit tarixi</h1>
        <p className="text-sm text-slate-500">
          Tizimdagi barcha muhim amallar, o‘zgarishlar va foydalanuvchi faoliyati xronologiyasi
        </p>
      </div>

      <AuditStats logs={mockAuditLogs} />

      <AuditFilters />

      <AuditTable logs={mockAuditLogs} />
    </div>
  );
}