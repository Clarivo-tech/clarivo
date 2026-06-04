import { NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  DEMO_TIMEZONE,
  formatUkDate,
  isWeekday,
  TIME_SLOTS,
  toDateOnly,
} from "@/lib/demo-bookings/constants";
import {
  buildGoogleCalendarLink,
  buildOutlookCalendarLink,
} from "@/lib/demo-bookings/calendar-links";
import { sendEmail } from "@/lib/email/send";
import {
  demoBookingAdminEmail,
  demoBookingCustomerEmail,
} from "@/lib/email/templates";

type BookingBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  bookingDate?: string;
  bookingTime?: string;
  timezone?: string;
  notes?: string;
};

function validateDateWindow(dateRaw: string): boolean {
  const parts = dateRaw.split("-");
  if (parts.length !== 3) return false;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return false;
  }

  const booking = toDateOnly(new Date(year, month - 1, day));
  if (Number.isNaN(booking.getTime())) return false;
  if (!isWeekday(booking)) return false;

  const today = toDateOnly(new Date());
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 1);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

  return booking >= minDate && booking <= maxDate;
}

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Date is required." }, { status: 400 });
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("demo_bookings")
    .select("booking_time")
    .eq("booking_date", date)
    .eq("status", "confirmed");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const booked = (data ?? []).map((r) => String(r.booking_time));
  return NextResponse.json({ bookedSlots: booked });
}

export async function POST(request: Request) {
  let body: BookingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const company = body.company?.trim() ?? "";
  const bookingDate = body.bookingDate?.trim() ?? "";
  const bookingTime = body.bookingTime?.trim() ?? "";
  const jobTitle = body.jobTitle?.trim() || null;
  const notes = body.notes?.trim() || null;

  if (!firstName || !lastName || !email || !company || !bookingDate || !bookingTime) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!validateDateWindow(bookingDate)) {
    return NextResponse.json({ error: "Invalid booking date." }, { status: 400 });
  }

  if (!TIME_SLOTS.includes(bookingTime)) {
    return NextResponse.json({ error: "Invalid booking time." }, { status: 400 });
  }

  const supabase = createPublicSupabaseClient();

  const { data: clashRows, error: clashError } = await supabase
    .from("demo_bookings")
    .select("id")
    .eq("booking_date", bookingDate)
    .eq("booking_time", bookingTime)
    .eq("status", "confirmed")
    .limit(1);

  if (clashError) {
    return NextResponse.json({ error: clashError.message }, { status: 500 });
  }
  if (clashRows && clashRows.length > 0) {
    return NextResponse.json({ error: "That slot is no longer available." }, { status: 409 });
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const { data: inserted, error: insertError } = await supabase
    .from("demo_bookings")
    .insert({
      name: fullName,
      email,
      company,
      job_title: jobTitle,
      booking_date: bookingDate,
      booking_time: bookingTime,
      timezone: body.timezone?.trim() || DEMO_TIMEZONE,
      status: "confirmed",
      notes,
    })
    .select("id, booking_date, booking_time, company, email, name")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message || "Insert failed." }, { status: 500 });
  }

  const dateLabel = formatUkDate(bookingDate);
  const timeLabel = bookingTime;
  const googleCalendarUrl = buildGoogleCalendarLink({
    name: fullName,
    company,
    date: bookingDate,
    time: bookingTime,
  });
  const outlookCalendarUrl = buildOutlookCalendarLink({
    name: fullName,
    company,
    date: bookingDate,
    time: bookingTime,
  });

  await sendEmail({
    to: email,
    ...demoBookingCustomerEmail({
      firstName,
      company,
      dateLabel,
      timeLabel,
    }),
  });

  await sendEmail({
    to: "bill@clarivo-tech.com",
    ...demoBookingAdminEmail({
      name: fullName,
      email,
      company,
      jobTitle,
      dateLabel,
      timeLabel,
      notes,
    }),
  });

  return NextResponse.json({
    success: true,
    booking: inserted,
    googleCalendarUrl,
    outlookCalendarUrl,
    dateLabel,
    timeLabel,
  });
}
