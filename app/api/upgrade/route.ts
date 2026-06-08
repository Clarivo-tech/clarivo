import { NextResponse } from "next/server";
import { PRICE_PER_LICENSE_GBP, MIN_LICENSES, MAX_LICENSES } from "@/lib/billing/constants";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Manual license activation is disabled. Complete payment via Stripe checkout on the upgrade page.",
    },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json({
    pricePerLicense: PRICE_PER_LICENSE_GBP,
    minLicenses: MIN_LICENSES,
    maxLicenses: MAX_LICENSES,
  });
}
