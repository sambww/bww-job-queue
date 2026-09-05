import { JobsAdmin } from "@/components/admin/JobsAdmin";
import { listAllJobs, listRigs, listSupervisors } from "@/lib/board";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sand">Set DATABASE_URL to manage jobs.</p>;
  }

  const [jobRows, rigs, supervisors] = await Promise.all([
    listAllJobs(),
    listRigs(true),
    listSupervisors(),
  ]);

  const jobs = jobRows.map((job) => ({
    id: job.id,
    jobCode: job.jobCode,
    workizId: job.workizId,
    rigId: job.rigId,
    supervisorId: job.supervisorId,
    customerName: job.customerName,
    address: job.address,
    jobType: job.jobType,
    description: job.description,
    estimatedStartDate: job.estimatedStartDate?.toISOString() ?? null,
    status: job.status,
    queuePosition: job.queuePosition,
    customerEmail: job.customerEmail,
    customerPhone: job.customerPhone,
    customerNotifyOptIn: job.customerNotifyOptIn,
    supervisorName: job.supervisorName,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  }));

  return <JobsAdmin initialJobs={jobs} rigs={rigs} supervisors={supervisors} />;
}
