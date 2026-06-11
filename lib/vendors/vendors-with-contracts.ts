import type { Contract } from "@/lib/types/contracts";
import type { Vendor } from "@/lib/types/vendors";

export function vendorsWithLinkedContracts(
  vendors: Vendor[],
  contracts: Contract[]
): Vendor[] {
  const linkedVendorIds = new Set(
    contracts.map((contract) => contract.vendor_id).filter(Boolean) as string[]
  );

  return vendors.filter((vendor) => linkedVendorIds.has(vendor.id));
}
