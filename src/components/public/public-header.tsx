
'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Syringe, LogIn, Globe, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-[1.02]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <MapPin className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-none tracking-tight">Tibbiyot GIS Portal</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
              Fazoviy ma’lumotlar geoportali
            </span>
          </div>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 md:flex">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
                  <Globe className="h-4 w-4" />
                  <span>O'zbekcha</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem className="rounded-lg">O'zbekcha</DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg">Русский</DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg">English</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-4 w-px bg-border mx-2" />

          <Button asChild className="rounded-xl px-6 shadow-md shadow-primary/10 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95">
            <Link href="/login" className="gap-2">
              <LogIn className="h-4 w-4" />
              <span>Kirish</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
