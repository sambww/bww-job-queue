import { QueueManager } from "@/components/admin/QueueManager";
import { getBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

export default async function AdminQueuePage() {
  const board = await getBoard();
  return <QueueManager initial={board} />;
}
