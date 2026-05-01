"use client";

import { Button } from "@/components/ui/button";
import { FileUp, FileText, X, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function AttachmentUploadBox() {
  const [files, setFiles] = useState<{ id: string; name: string; size: string }[]>([]);

  const handleFileAdd = () => {
    // Mock file add
    const newFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: `hujjat_${files.length + 1}.pdf`,
      size: "2.4 MB"
    };
    setFiles([...files, newFile]);
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <div 
        onClick={handleFileAdd}
        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 hover:border-primary/50 hover:bg-slate-50 transition-all cursor-pointer group"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <FileUp className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-900">Fayllarni yuklang</p>
        <p className="text-xs text-slate-500">PDF, JPG, PNG (Maksimal 10MB)</p>
      </div>

      {files.length > 0 && (
        <div className="grid gap-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-50 text-blue-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-900">{file.name}</p>
                  <p className="text-[10px] text-slate-500">{file.size}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400 hover:text-destructive"
                onClick={() => removeFile(file.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-[11px] text-emerald-700 border border-emerald-100">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>Barcha yuklangan hujjatlar xavfsiz serverda saqlanadi va faqat vakolatli xodimlar uchun ochiq.</span>
      </div>
    </div>
  );
}
