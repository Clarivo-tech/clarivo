export type ExtractedContract = {
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
};
