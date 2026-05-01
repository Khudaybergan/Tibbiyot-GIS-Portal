'use client';

import { StatsCards } from "@/components/admin/objects-management/stats-cards";
import { FilterBar } from "@/components/admin/objects-management/filter-bar";
import { DataTable } from "@/components/admin/objects-management/data-table";
import { Button } from "@/components/ui/button";
import { Plus, FileUp, ClipboardList, History } from "lucide-react";
import { adminMedicalObjects } from "@/lib/admin/mock-data";
import Link from "next/link";

export default function MedicalObjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Muassasalar</h1>
          <p className="text-sm text-slate-500">
            Tibbiyot muassasalari va obyektlarini boshqarish tizimi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/audit-log">
              <History className="mr-2 h-4 w-4" />
              Audit tarixi
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/objects/bulk-paste">
              <ClipboardList className="mr-2 h-4 w-4" />
              Exceldan kiritish
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/objects/import">
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/admin/objects/new">
              <Plus className="mr-2 h-4 w-4" />
              Yangi muassasa
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <StatsCards />

      {/* Filters Section */}
      <FilterBar />

      {/* Main Table Section */}
      <DataTable data={adminMedicalObjects} />
    </div>
  );
}
