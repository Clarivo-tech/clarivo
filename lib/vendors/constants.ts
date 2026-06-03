import type { VendorDocumentType, VendorRiskRating, VendorStatus } from "@/lib/types/vendors";

export const VENDOR_INDUSTRIES = [
  "Technology",
  "Finance",
  "HR",
  "Legal",
  "Marketing",
  "Operations",
  "Facilities",
  "Other",
] as const;

export const VENDOR_TYPES = [
  "Software/SaaS",
  "Managed Services",
  "Professional Services",
  "Hardware",
  "Facilities",
  "Other",
] as const;

export const VENDOR_STATUSES: { value: VendorStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "under_review", label: "Under Review" },
];

export const VENDOR_RISK_RATINGS: { value: VendorRiskRating; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const VENDOR_COUNTRIES = [
  "United Kingdom",
  "Ireland",
  "United States",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Italy",
  "Other",
] as const;

export const VENDOR_DOCUMENT_TYPES: {
  value: VendorDocumentType;
  label: string;
}[] = [
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "iso_certification", label: "ISO Certification" },
  { value: "soc2_report", label: "SOC2 Report" },
  { value: "nda", label: "NDA" },
  { value: "dpa", label: "DPA" },
  { value: "other", label: "Other" },
];

export function formatVendorStatus(status: VendorStatus): string {
  return VENDOR_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function formatRiskRating(rating: VendorRiskRating): string {
  return VENDOR_RISK_RATINGS.find((r) => r.value === rating)?.label ?? rating;
}

export function formatDocumentType(type: VendorDocumentType): string {
  return VENDOR_DOCUMENT_TYPES.find((d) => d.value === type)?.label ?? type;
}

export function vendorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

export function normalizeVendorName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
