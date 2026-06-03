import { createClient } from "@/lib/supabase/server";
import {
  AdminBookingsTable,
  type BookingRow,
} from "@/components/dashboard/admin-bookings-table";

export const dynamic = "force-dynamic";

export default async function DemoBookingsAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("demo_bookings")
    .select("id, name, email, company, booking_date, booking_time, status, notes")
    .gte("booking_date", today)
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Demo Bookings
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Upcoming demo calls sorted by date.
        </p>
      </div>
      <AdminBookingsTable initialRows={(data ?? []) as BookingRow[]} />
    </div>
  );
}
