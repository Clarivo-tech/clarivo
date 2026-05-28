import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message:
      "Stripe checkout coming soon - contact bill@clarivo-tech.com to upgrade",
  });
}
