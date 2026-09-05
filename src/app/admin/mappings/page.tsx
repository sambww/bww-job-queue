import { MappingsAdmin } from "@/components/admin/MappingsAdmin";
import { listMappings, listRigs } from "@/lib/board";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MappingsPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sand">Set DATABASE_URL to manage mappings.</p>;
  }
  const [mappings, rigs] = await Promise.all([listMappings(), listRigs(true)]);
  return <MappingsAdmin initial={mappings} rigs={rigs} />;
}
