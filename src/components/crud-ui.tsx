import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function DataCard({ children }: { children: ReactNode }) {
  return <Card className="overflow-hidden">{children}</Card>;
}

export { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Plus, Pencil, Trash2 };

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <div className="p-12 text-center text-sm text-muted-foreground">{label}</div>;
}

export function useDialog() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, openNew: () => setOpen(true), close: () => setOpen(false) };
}
