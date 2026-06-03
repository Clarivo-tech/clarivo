"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEMO_TIMEZONE,
  formatUkDate,
  isWeekday,
  TIME_SLOTS,
  toDateOnly,
} from "@/lib/demo-bookings/constants";

type Step = 1 | 2 | 3;

type BookingResult = {
  dateLabel: string;
  timeLabel: string;
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
};

function dateToIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildAvailableDates(): string[] {
  const today = toDateOnly(new Date());
  const list: string[] = [];
  for (let i = 1; i <= 30; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (!isWeekday(d)) continue;
    list.push(dateToIso(d));
  }
  return list;
}

export default function BookDemoPage() {
  const [step, setStep] = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [notes, setNotes] = useState("");

  const availableDates = useMemo(() => buildAvailableDates(), []);

  async function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedTime(null);
    setError(null);
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/demo-bookings?date=${date}`);
      const payload = (await res.json()) as { bookedSlots?: string[]; error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not load available slots.");
        setBookedSlots([]);
      } else {
        setBookedSlots(payload.bookedSlots ?? []);
        setStep(2);
      }
    } catch {
      setError("Could not load available slots.");
      setBookedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleSubmit() {
    if (!selectedDate || !selectedTime) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/demo-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          company,
          jobTitle,
          bookingDate: selectedDate,
          bookingTime: selectedTime,
          timezone: DEMO_TIMEZONE,
          notes,
        }),
      });
      const payload = (await res.json()) as
        | ({ error?: string } & Partial<BookingResult>)
        | undefined;
      if (!res.ok || !payload) {
        setError(payload?.error ?? "Could not confirm booking.");
        return;
      }

      setResult({
        dateLabel: payload.dateLabel ?? formatUkDate(selectedDate),
        timeLabel: payload.timeLabel ?? selectedTime,
        googleCalendarUrl: payload.googleCalendarUrl ?? "#",
        outlookCalendarUrl: payload.outlookCalendarUrl ?? "#",
      });
    } catch {
      setError("Could not confirm booking.");
    } finally {
      setSubmitting(false);
    }
  }

  const detailsValid =
    firstName.trim() && lastName.trim() && email.trim() && company.trim();

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-10">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Demo with a human
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Pick a date and time in UK time, then confirm your details.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`rounded-full px-3 py-1 ${
                step === n
                  ? "bg-[#F97316] text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Step {n}
            </span>
          ))}
        </div>

        {result ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
            <h2 className="mt-3 text-2xl font-semibold text-zinc-900">
              Booking Scheduled!
            </h2>
            <p className="mt-2 text-zinc-700">
              {result.dateLabel} at {result.timeLabel} (UK time)
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              You'll receive a meeting link via email - Please check your spam folder!
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="https://clarivo-tech.com"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Return to Clarivo
              </a>
            </div>
          </div>
        ) : (
          <>
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-900">Step 1  Pick a date</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {availableDates.map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => void handleDateSelect(date)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedDate === date
                        ? "border-[#F97316] bg-orange-50 text-[#F97316]"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    {formatUkDate(date)}
                  </button>
                ))}
              </div>
            </section>

            {selectedDate ? (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Step 2  Pick a time slot
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {formatUkDate(selectedDate)} in {DEMO_TIMEZONE}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {TIME_SLOTS.map((slot) => {
                    const unavailable = bookedSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={loadingSlots || unavailable}
                        onClick={() => {
                          setSelectedTime(slot);
                          setStep(3);
                        }}
                        className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                          unavailable
                            ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                            : selectedTime === slot
                            ? "border-[#F97316] bg-orange-50 text-[#F97316]"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                        }`}
                      >
                        {slot} {unavailable ? "Unavailable" : ""}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {selectedDate && selectedTime ? (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Step 3  Your details
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-10 rounded-lg border border-zinc-200 px-3 text-sm"
                  />
                  <input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-10 rounded-lg border border-zinc-200 px-3 text-sm"
                  />
                  <input
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 rounded-lg border border-zinc-200 px-3 text-sm sm:col-span-2"
                  />
                  <input
                    placeholder="Company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-10 rounded-lg border border-zinc-200 px-3 text-sm sm:col-span-2"
                  />
                  <input
                    placeholder="Job title (optional)"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="h-10 rounded-lg border border-zinc-200 px-3 text-sm sm:col-span-2"
                  />
                  <textarea
                    placeholder="Notes or what would you like to cover? (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-24 rounded-lg border border-zinc-200 px-3 py-2 text-sm sm:col-span-2"
                  />
                </div>

                {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

                <Button
                  className="mt-4 bg-[#F97316] text-white hover:bg-[#111827]"
                  disabled={!detailsValid || submitting}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? "Confirming..." : "Confirm booking"}
                  <ChevronRight className="size-4" />
                </Button>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
