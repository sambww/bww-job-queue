export type WorkizJob = Record<string, unknown>;

export type MappedWorkizJob = {
  workizId: string;
  jobCode: string;
  customerName: string;
  address: string;
  jobType: string;
  description: string;
  estimatedStartDate: Date | null;
  status: string;
  customerEmail: string | null;
  customerPhone: string | null;
  supervisorName: string | null;
  tags: string[];
  supervisorCandidates: string[];
};

export type MappingRecord = {
  id: string;
  matchType: string;
  matchValue: string;
  rigId: string;
};
