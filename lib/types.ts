// types.ts defines the shape of grants, applications, statuses, and API errors.
export type ApplicationStatus = "submitted" | "in_review" | "approved" | "rejected";

export type GrantListItem = {
  id: string;
  title: string;
  donor: string;
  donorType: string;
  sector: string;
  eligibleCountries: string[];
  minAmountUsd: number;
  maxAmountUsd: number;
  durationMonths: number;
  deadline: string | null;
  isExpired: boolean;
  applicationCount: number;
};

export type GrantDetail = GrantListItem & {
  description: string;
  applications: Application[];
};

export type Application = {
  id: string;
  grantId: string;
  orgName: string;
  orgEmail: string;
  requestedAmountUsd: number;
  status: ApplicationStatus;
  submittedAt: string;
};

export type ApiError = {
  error: string;
  details?: Record<string, string>;
};
