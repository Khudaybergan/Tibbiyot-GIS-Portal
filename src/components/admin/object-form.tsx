"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MedicalObject } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(2, "Nom kamida 2 belgidan iborat bo'lishi kerak."),
  type: z.enum(["Davlat klinikalari", "Xususiy klinikalari", "Dorixonalar"]),
  address: z.string().min(5, "Manzil kamida 5 belgidan iborat bo'lishi kerak."),
  inn: z.string().regex(/^\d{9}$/, "INN 9 ta raqamdan iborat bo'lishi kerak."),
});

type ObjectFormProps = {
  defaultValues?: MedicalObject;
  onSave: (data: MedicalObject) => void;
  onClose: () => void;
};

export function ObjectForm({ defaultValues, onSave, onClose }: ObjectFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      type: defaultValues?.type || "Davlat klinikalari",
      address: defaultValues?.address || "",
      inn: defaultValues?.inn || "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave({ id: defaultValues?.id || Date.now(), ...values });
    onClose();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Obyekt nomi</FormLabel>
              <FormControl>
                <Input placeholder="Masalan, Shox Med Center" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Turi</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Obyekt turini tanlang" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Davlat klinikalari">Davlat klinikalari</SelectItem>
                  <SelectItem value="Xususiy klinikalari">Xususiy klinikalari</SelectItem>
                  <SelectItem value="Dorixonalar">Dorixonalar</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Manzil</FormLabel>
              <FormControl>
                <Input placeholder="Toshkent sh., Mirzo Ulug'bek t." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="inn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>INN (STIR)</FormLabel>
              <FormControl>
                <Input placeholder="123456789" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit">Saqlash</Button>
        </div>
      </form>
    </Form>
  );
}
