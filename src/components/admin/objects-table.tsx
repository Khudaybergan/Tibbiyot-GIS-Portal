"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, PlusCircle, Search, Trash2, Edit } from "lucide-react";
import type { MedicalObject } from "@/lib/types";
import { ObjectForm } from "./object-form";

type ObjectsTableProps = {
  data: MedicalObject[];
};

export function ObjectsTable({ data: initialData }: ObjectsTableProps) {
  const [data, setData] = useState<MedicalObject[]>(initialData);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState<MedicalObject | undefined>(undefined);
  const [objectToDelete, setObjectToDelete] = useState<number | null>(null);

  const filteredData = data.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.address.toLowerCase().includes(search.toLowerCase()) ||
      item.inn.includes(search)
  );

  const handleSave = (formData: MedicalObject) => {
    if (selectedObject) {
      setData(data.map((item) => (item.id === selectedObject.id ? { ...item, ...formData } : item)));
    } else {
      setData([{ ...formData, id: Date.now() }, ...data]);
    }
    setSelectedObject(undefined);
  };

  const handleOpenForm = (obj?: MedicalObject) => {
    setSelectedObject(obj);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedObject(undefined);
  };

  const handleOpenAlert = (id: number) => {
    setObjectToDelete(id);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (objectToDelete !== null) {
      setData(data.filter((item) => item.id !== objectToDelete));
      setObjectToDelete(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Qidirish..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => handleOpenForm()} className="whitespace-nowrap">
          <PlusCircle className="mr-2 h-4 w-4" />
          Obyekt qo'shish
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomi</TableHead>
              <TableHead>Turi</TableHead>
              <TableHead>Manzil</TableHead>
              <TableHead>INN (STIR)</TableHead>
              <TableHead className="w-[50px] text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.address}</TableCell>
                <TableCell>{item.inn}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenForm(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Tahrirlash
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleOpenAlert(item.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Arxivlash
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedObject ? "Obyektni tahrirlash" : "Yangi obyekt qo'shish"}</DialogTitle>
          </DialogHeader>
          <ObjectForm defaultValues={selectedObject} onSave={handleSave} onClose={handleCloseForm} />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Haqiqatan ham arxivlamoqchimisiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu amalni bekor qilib bo'lmaydi. Bu obyektni serverdan
              butunlay o'chirib yuboradi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Arxivlash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
