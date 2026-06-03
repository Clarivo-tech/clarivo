export type VendorStatus = "active" | "inactive" | "under_review";
export type VendorRiskRating = "low" | "medium" | "high" | "critical";

export type Vendor = {
  id: string;
  organisation_id: string | null;
  user_id: string;
  name: string;
  website: string | null;
  company_registration: string | null;
  address: string | null;
  country: string;
  industry: string | null;
  vendor_type: string | null;
  status: VendorStatus;
  risk_rating: VendorRiskRating;
  is_critical: boolean;
  is_single_source: boolean;
  account_manager_name: string | null;
  account_manager_email: string | null;
  account_manager_phone: string | null;
  support_contact_name: string | null;
  support_contact_email: string | null;
  escalation_contact_name: string | null;
  escalation_contact_email: string | null;
  notes: string | null;
  tags: string[] | null;
  auto_created: boolean;
  created_at: string;
  updated_at: string;
};

export type VendorDocumentType =
  | "insurance_certificate"
  | "iso_certification"
  | "soc2_report"
  | "nda"
  | "dpa"
  | "other";

export type VendorDocument = {
  id: string;
  vendor_id: string;
  user_id: string;
  name: string;
  document_type: VendorDocumentType;
  storage_path: string;
  file_size: number | null;
  expiry_date: string | null;
  uploaded_at: string;
  created_at: string;
};

export type VendorActivity = {
  id: string;
  vendor_id: string;
  user_id: string;
  action_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type VendorListRow = Vendor & {
  contractCount: number;
  totalSpend: number;
};

export type VendorFormInput = {
  name: string;
  website?: string;
  companyRegistration?: string;
  address?: string;
  country?: string;
  industry?: string;
  vendorType?: string;
  status?: VendorStatus;
  riskRating?: VendorRiskRating;
  isCritical?: boolean;
  isSingleSource?: boolean;
  accountManagerName?: string;
  accountManagerEmail?: string;
  accountManagerPhone?: string;
  supportContactName?: string;
  supportContactEmail?: string;
  escalationContactName?: string;
  escalationContactEmail?: string;
  notes?: string;
  tags?: string;
};

export type VendorStats = {
  totalVendors: number;
  criticalVendors: number;
  highRiskVendors: number;
  totalVendorSpend: number;
};
