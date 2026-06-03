import type { Vendor, VendorRiskRating } from "@/lib/types/vendors";

export type VendorRiskRatingGuide = {
  label: string;
  summary: string;
  criteria: string[];
};

export const VENDOR_RISK_RATING_GUIDE: Record<
  VendorRiskRating,
  VendorRiskRatingGuide
> = {
  low: {
    label: "Low",
    summary:
      "Replaceable supplier with limited impact if the relationship ends.",
    criteria: [
      "Low spend or several alternative providers available",
      "Contracts allow reasonable notice or exit",
      "Not essential to daily operations",
    ],
  },
  medium: {
    label: "Medium",
    summary:
      "Meaningful supplier with moderate dependency—worth monitoring but not business-critical on its own.",
    criteria: [
      "Moderate spend or some operational reliance",
      "Some switching cost or notice period",
      "Important but alternatives exist with effort",
    ],
  },
  high: {
    label: "High",
    summary:
      "Significant dependency—disruption would materially affect operations or budget.",
    criteria: [
      "High spend concentration or few alternatives",
      "Long notice periods, lock-in, or complex migration",
      "Material impact on a key business function",
    ],
  },
  critical: {
    label: "Critical",
    summary:
      "Essential supplier—failure or exit would severely harm the organisation.",
    criteria: [
      "Mission-critical service with no practical substitute",
      "Very high spend and/or single-source dependency",
      "Regulatory, security, or continuity risk if vendor fails",
    ],
  },
};

export const VENDOR_RISK_RATING_INTRO =
  "Vendor risk rating is a manual classification your team assigns. It is not calculated from contract text or spend—it reflects how much harm disruption from this supplier would cause.";

export function getVendorRiskRatingSourceNote(vendor: Vendor): string {
  if (vendor.auto_created && vendor.risk_rating === "medium") {
    return "This vendor was auto-created from a contract upload and given the default rating Medium. Review spend, alternatives, and operational reliance, then update via Edit.";
  }
  if (vendor.auto_created) {
    return "This vendor was auto-created from a contract upload. The risk rating was set or updated on the profile—not derived from AI extraction.";
  }
  return "Set on this vendor profile when created or last edited. Update via Edit whenever your assessment changes.";
}

export function getVendorRiskRatingTooltip(rating: VendorRiskRating): string {
  const guide = VENDOR_RISK_RATING_GUIDE[rating];
  return `${guide.summary}\n\nTypical indicators:\n• ${guide.criteria.join("\n• ")}`;
}
