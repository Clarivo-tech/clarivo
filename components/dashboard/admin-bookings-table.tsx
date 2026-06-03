"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export type BookingRow = {
  id: string;
  name: string;
  email: string;
  company: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string | null;
};

export function AdminBookingsTable({ initialRows }: { initialRows: BookingRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [pending, startTransition] = useTransition();

  function setStatus(id: string, status: "completed" | "cancelled") {
    startTransition(async () => {
      const res = await fetch(`/api/demo-bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-zinc-500">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Notes</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-3 font-medium text-zinc-900">{row.name}</td>
              <td className="px-4 py-3 text-zinc-700">{row.company}</td>
              <td className="px-4 py-3 text-zinc-700">{row.email}</td>
              <td className="px-4 py-3 text-zinc-700">
                {new Date(`${row.booking_date}T12:00:00Z`).toLocaleDateString("en-GB")}
              </td>
              <td className="px-4 py-3 text-zinc-700">{row.booking_time}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  {row.status}
                </span>
              </td>
              <td className="max-w-[280px] px-4 py-3 text-zinc-600">
                <span className="line-clamp-2">{row.notes || "-"}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setStatus(row.id, "completed")}
                  >
                    Mark completed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setStatus(row.id, "cancelled")}
                  >
                    Cancel
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                No upcoming bookings.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
