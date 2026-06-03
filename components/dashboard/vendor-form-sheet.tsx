"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createVendor, updateVendor } from "@/app/dashboard/vendors/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  VENDOR_COUNTRIES,
  VENDOR_INDUSTRIES,
  VENDOR_RISK_RATINGS,
  VENDOR_STATUSES,
  VENDOR_TYPES,
} from "@/lib/vendors/constants";
import { VENDOR_RISK_RATING_GUIDE } from "@/lib/vendors/risk-rating";
import type { Vendor, VendorFormInput } from "@/lib/types/vendors";

const selectClassName =
  "flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-900 shadow-xs outline-none focus-visible:border-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316]/20";

function vendorToForm(vendor?: Vendor | null): VendorFormInput {
  if (!vendor) {
    return {
      name: "",
      country: "United Kingdom",
      status: "active",
      riskRating: "medium",
      isCritical: false,
      isSingleSource: false,
    };
  }
  return {
    name: vendor.name,
    website: vendor.website ?? "",
    companyRegistration: vendor.company_registration ?? "",
    address: vendor.address ?? "",
    country: vendor.country,
    industry: vendor.industry ?? "",
    vendorType: vendor.vendor_type ?? "",
    status: vendor.status,
    riskRating: vendor.risk_rating,
    isCritical: vendor.is_critical,
    isSingleSource: vendor.is_single_source,
    accountManagerName: vendor.account_manager_name ?? "",
    accountManagerEmail: vendor.account_manager_email ?? "",
    accountManagerPhone: vendor.account_manager_phone ?? "",
    supportContactName: vendor.support_contact_name ?? "",
    supportContactEmail: vendor.support_contact_email ?? "",
    escalationContactName: vendor.escalation_contact_name ?? "",
    escalationContactEmail: vendor.escalation_contact_email ?? "",
    notes: vendor.notes ?? "",
    tags: vendor.tags?.join(", ") ?? "",
  };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-zinc-100 pb-2 font-sans text-base font-semibold text-zinc-900">
      {children}
    </h3>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-600">
        {label}
        {required ? <span className="text-[#111827]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export function VendorFormSheet({
  open,
  onOpenChange,
  vendor,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor | null;
  onSaved?: (vendorId?: string) => void;
}) {
  const [form, setForm] = useState<VendorFormInput>(() => vendorToForm(vendor));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(vendor?.id);

  useEffect(() => {
    if (open) {
      setForm(vendorToForm(vendor));
      setError(null);
    }
  }, [open, vendor]);

  function update<K extends keyof VendorFormInput>(
    key: K,
    value: VendorFormInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateVendor(vendor!.id, form)
        : await createVendor(form);

      if (result.error) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSaved?.("vendorId" in result ? result.vendorId : vendor?.id);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-zinc-100 px-6 py-5">
          <SheetTitle className="font-sans text-lg font-semibold text-zinc-900">
            {isEdit ? "Edit vendor" : "Add vendor"}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <section className="space-y-4">
              <SectionTitle>Company details</SectionTitle>
              <Field label="Vendor name" required>
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                />
              </Field>
              <Field label="Website">
                <Input
                  type="url"
                  value={form.website ?? ""}
                  onChange={(e) => update("website", e.target.value)}
                  placeholder="https://"
                />
              </Field>
              <Field label="Company registration number">
                <Input
                  value={form.companyRegistration ?? ""}
                  onChange={(e) =>
                    update("companyRegistration", e.target.value)
                  }
                />
              </Field>
              <Field label="Address">
                <Input
                  value={form.address ?? ""}
                  onChange={(e) => update("address", e.target.value)}
                />
              </Field>
              <Field label="Country">
                <select
                  className={selectClassName}
                  value={form.country ?? "United Kingdom"}
                  onChange={(e) => update("country", e.target.value)}
                >
                  {VENDOR_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Industry">
                <select
                  className={selectClassName}
                  value={form.industry ?? ""}
                  onChange={(e) => update("industry", e.target.value)}
                >
                  <option value="">Select industry</option>
                  {VENDOR_INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vendor type">
                <select
                  className={selectClassName}
                  value={form.vendorType ?? ""}
                  onChange={(e) => update("vendorType", e.target.value)}
                >
                  <option value="">Select type</option>
                  {VENDOR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className={selectClassName}
                  value={form.status ?? "active"}
                  onChange={(e) =>
                    update("status", e.target.value as VendorFormInput["status"])
                  }
                >
                  {VENDOR_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </section>

            <section className="space-y-4">
              <SectionTitle>Risk &amp; classification</SectionTitle>
              <Field label="Risk rating">
                <select
                  className={selectClassName}
                  value={form.riskRating ?? "medium"}
                  onChange={(e) =>
                    update(
                      "riskRating",
                      e.target.value as VendorFormInput["riskRating"]
                    )
                  }
                >
                  {VENDOR_RISK_RATINGS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-relaxed text-zinc-500">
                  {VENDOR_RISK_RATING_GUIDE[form.riskRating ?? "medium"].summary}
                </p>
              </Field>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.isCritical ?? false}
                  onChange={(e) => update("isCritical", e.target.checked)}
                  className="size-4 rounded border-zinc-300"
                />
                Critical vendor
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.isSingleSource ?? false}
                  onChange={(e) => update("isSingleSource", e.target.checked)}
                  className="size-4 rounded border-zinc-300"
                />
                Single source dependency
              </label>
              <Field label="Tags (comma separated)">
                <Input
                  value={form.tags ?? ""}
                  onChange={(e) => update("tags", e.target.value)}
                  placeholder="saas, priority"
                />
              </Field>
            </section>

            <section className="space-y-4">
              <SectionTitle>Key contacts</SectionTitle>
              <p className="text-xs font-medium text-zinc-500">Account manager</p>
              <Field label="Name">
                <Input
                  value={form.accountManagerName ?? ""}
                  onChange={(e) =>
                    update("accountManagerName", e.target.value)
                  }
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.accountManagerEmail ?? ""}
                  onChange={(e) =>
                    update("accountManagerEmail", e.target.value)
                  }
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.accountManagerPhone ?? ""}
                  onChange={(e) =>
                    update("accountManagerPhone", e.target.value)
                  }
                />
              </Field>
              <p className="pt-2 text-xs font-medium text-zinc-500">
                Support contact
              </p>
              <Field label="Name">
                <Input
                  value={form.supportContactName ?? ""}
                  onChange={(e) => update("supportContactName", e.target.value)}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.supportContactEmail ?? ""}
                  onChange={(e) =>
                    update("supportContactEmail", e.target.value)
                  }
                />
              </Field>
              <p className="pt-2 text-xs font-medium text-zinc-500">
                Escalation contact
              </p>
              <Field label="Name">
                <Input
                  value={form.escalationContactName ?? ""}
                  onChange={(e) =>
                    update("escalationContactName", e.target.value)
                  }
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.escalationContactEmail ?? ""}
                  onChange={(e) =>
                    update("escalationContactEmail", e.target.value)
                  }
                />
              </Field>
            </section>

            <section className="space-y-4">
              <SectionTitle>Notes</SectionTitle>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs outline-none focus-visible:border-[#F97316] focus-visible:ring-2 focus-visible:ring-[#F97316]/20"
                value={form.notes ?? ""}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Internal notes about this vendor…"
              />
            </section>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="border-t border-zinc-100 px-6 py-4">
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-[#F97316] text-white hover:bg-[#111827]"
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save vendor"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
