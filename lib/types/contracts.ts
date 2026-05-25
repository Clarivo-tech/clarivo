export type ContractFileStatus =
  | "pending"
  | "processing"
  | "completed"
  | "complete"
  | "failed";

export type ContractDataStatus =
  | "active"
  | "expiring"
  | "expired"
  | "renewed"
  | "pending";

export type Contract = {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  storage_path?: string | null;
  status: ContractFileStatus;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
};

export type ContractData = {
  id: string;
  contract_id: string;
  user_id: string;
  vendor_name: string | null;
  contract_value: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  notice_period_days: number | null;
  auto_renews: boolean | null;
  contract_type: string | null;
  summary: string | null;
  status: ContractDataStatus;
  created_at: string;
  updated_at: string;
};

export type DashboardStats = {
  totalContracts: number;
  totalSpend: number;
  renewalsThisMonth: number;
  expiringSoon: number;
};
