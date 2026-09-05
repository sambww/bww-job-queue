import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <AdminNav />
      <div className="mx-auto max-w-[1500px] px-5 py-6">{children}</div>
    </div>
  );
}
