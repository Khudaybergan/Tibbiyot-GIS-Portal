import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sozlamalar</h1>
        <p className="text-muted-foreground">
          Tizim va xarita sozlamalarini boshqarish.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Xarita Sozlamalari</CardTitle>
          <CardDescription>
            Boshlang'ich ko'rinish, uslublar va boshqa parametrlar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Sozlamalar paneli bu yerda bo'ladi.</p>
        </CardContent>
      </Card>
    </div>
  );
}
