import type { ReactNode } from "react";
import type { BoardJob } from "@/lib/board";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export function JobCard({
  job,
  actions,
}: {
  job: BoardJob;
  actions?: ReactNode;
}) {
  return (
    <article className="job-card rounded-xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-wider text-cyan">
            #{job.queuePosition + 1} · {job.jobCode}
          </p>
          <h3 className="mt-1 text-base font-semibold text-paper">{job.customerName || "Untitled job"}</h3>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <dl className="space-y-1.5 text-sm text-muted">
        {job.jobType ? (
          <div>
            <dt className="sr-only">Type</dt>
            <dd className="text-sand">{job.jobType}</dd>
          </div>
        ) : null}
        {job.address ? (
          <div>
            <dt className="sr-only">Address</dt>
            <dd>{job.address}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
          <span>Start {formatDate(job.estimatedStartDate)}</span>
          {job.supervisorName ? <span>Sup. {job.supervisorName}</span> : null}
        </div>
        {job.description ? <p className="pt-1 text-xs leading-5 text-muted/90">{job.description}</p> : null}
      </dl>
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}
