"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, isBefore, parseISO, startOfToday } from "date-fns";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deleteVendor,
  deleteVendorDocument,
  getVendorDocumentSignedUrl,
  linkContractToVendor,
  updateVendorNotes,
} from "@/app/dashboard/vendors/actions";
import { ContractDetailPanel } from "@/components/dashboard/contract-detail-panel";
import { HealthScoreBadge } from "@/components/dashboard/health-score-badge";
import { ContractStatusBadge } from "@/components/dashboard/contract-status-badge";
import { VendorFormSheet } from "@/components/dashboard/vendor-form-sheet";
import { VendorRiskBadge } from "@/components/dashboard/vendor-risk-badge";
import { VendorStatusBadge } from "@/components/dashboard/vendor-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import {
  formatDocumentType,
  vendorInitials,
  VENDOR_DOCUMENT_TYPES,
} from "@/lib/vendors/constants";
import {
  getVendorRiskRatingSourceNote,
  VENDOR_RISK_RATING_GUIDE,
  VENDOR_RISK_RATING_INTRO,
} from "@/lib/vendors/risk-rating";
import {
  calculateVendorRelationshipHealth,
  relationshipHealthBg,
  relationshipHealthColor,
} from "@/lib/vendors/relationship-health";
import type { ContractData } from "@/lib/types/contracts";
import type {
  Vendor,
  VendorActivity,
  VendorDocument,
} from "@/lib/types/vendors";
import { cn } from "@/lib/utils";

const cardClass =
  "border-zinc-200/80 bg-white text-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)]";
const cardTitle = "font-sans text-base font-semibold text-zinc-900";

type Tab = "overview" | "contracts" | "documents" | "activity";

function formatSpend(value: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function documentExpiryStatus(expiry: string | null): "expired" | "soon" | null {
  if (!expiry) return null;
  try {
    const date = parseISO(expiry);
    const today = startOfToday();
    if (isBefore(date, today)) return "expired";
    if (isBefore(date, addDays(today, 30))) return "soon";
  } catch {
    return null;
  }
  return null;
}

export function VendorDetailPageClient({
  vendor,
  linkedData,
  unlinkedData,
  documents: initialDocuments,
  activity,
  totalSpend,
  baseCurrency,
}: {
  vendor: Vendor;
  linkedData: ContractData[];
  unlinkedData: ContractData[];
  documents: VendorDocument[];
  activity: VendorActivity[];
  totalSpend: number;
  baseCurrency: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [notes, setNotes] = useState(vendor.notes ?? "");
  const [notesEditing, setNotesEditing] = useState(false);
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(
    null
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [linkContractId, setLinkContractId] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const health = calculateVendorRelationshipHealth(vendor, linkedData);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "contracts", label: "Contracts" },
    { id: "documents", label: "Documents" },
    { id: "activity", label: "Activity" },
  ];

  function saveNotes() {
    startTransition(async () => {
      const result = await updateVendorNotes(vendor.id, notes);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      setNotesEditing(false);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${vendor.name}"? This cannot be undone.`
      )
    ) {
      return;
    }
    const result = await deleteVendor(vendor.id);
    if (result.error) {
      window.alert(result.error);
      return;
    }
    router.push("/dashboard/vendors");
  }

  function linkContract() {
    if (!linkContractId) return;
    startTransition(async () => {
      const result = await linkContractToVendor(vendor.id, linkContractId);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      setLinkContractId("");
      router.refresh();
    });
  }

  async function handleDocumentUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const res = await fetch(`/api/vendors/${vendor.id}/documents`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error ?? "Upload failed.");
        return;
      }
      if (json.document) {
        setDocuments((prev) => [json.document as VendorDocument, ...prev]);
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <Link
        href="/dashboard/vendors"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-500 hover:text-[#111827]"
      >
        <ArrowLeft className="size-4" />
        Back to vendors
      </Link>

      {vendor.auto_created ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This vendor was auto-created from a contract upload. Add more details
          to complete the profile.
        </div>
      ) : null}

      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-2xl font-bold text-white">
            {vendorInitials(vendor.name)}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {vendor.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
              {vendor.industry ? <span>{vendor.industry}</span> : null}
              {vendor.industry && vendor.vendor_type ? (
                <span className="text-zinc-300">|</span>
              ) : null}
              {vendor.vendor_type ? <span>{vendor.vendor_type}</span> : null}
              <VendorStatusBadge status={vendor.status} />
              <VendorRiskBadge rating={vendor.risk_rating} />
              {vendor.is_critical ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-900 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-red-800/80">
                  <Star className="size-3 fill-white text-white" />
                  Critical vendor
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={handleDelete}
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-zinc-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-[#F97316] text-[#111827]"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className={cardClass}>
            <CardHeader>
              <h2 className={cardTitle}>Company details</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Detail label="Website" value={vendor.website} link />
              <Detail
                label="Registration"
                value={vendor.company_registration}
              />
              <Detail label="Address" value={vendor.address} />
              <Detail label="Country" value={vendor.country} />
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader>
              <h2 className={cardTitle}>Key contacts</h2>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <ContactBlock
                title="Account manager"
                name={vendor.account_manager_name}
                email={vendor.account_manager_email}
                phone={vendor.account_manager_phone}
              />
              <ContactBlock
                title="Support"
                name={vendor.support_contact_name}
                email={vendor.support_contact_email}
              />
              <ContactBlock
                title="Escalation"
                name={vendor.escalation_contact_name}
                email={vendor.escalation_contact_email}
              />
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader>
              <h2 className={cardTitle}>Risk &amp; classification</h2>
              <p className="mt-2 text-sm text-zinc-600">
                {VENDOR_RISK_RATING_INTRO}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3">
                <Detail label="Risk rating">
                  <VendorRiskBadge rating={vendor.risk_rating} />
                </Detail>
                <p className="mt-2 text-sm text-zinc-700">
                  {VENDOR_RISK_RATING_GUIDE[vendor.risk_rating].summary}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {getVendorRiskRatingSourceNote(vendor)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  What &ldquo;{VENDOR_RISK_RATING_GUIDE[vendor.risk_rating].label}
                  &rdquo; usually indicates
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-600">
                  {VENDOR_RISK_RATING_GUIDE[vendor.risk_rating].criteria.map(
                    (item) => (
                      <li key={item}>{item}</li>
                    )
                  )}
                </ul>
              </div>
              <Detail
                label="Critical vendor"
                value={
                  vendor.is_critical
                    ? "Yes — flagged as business-critical (also affects relationship health score)"
                    : "No"
                }
              />
              <Detail
                label="Single source"
                value={
                  vendor.is_single_source
                    ? "Yes — few or no alternatives (also affects relationship health score)"
                    : "No"
                }
              />
              <Detail
                label="Tags"
                value={vendor.tags?.length ? vendor.tags.join(", ") : null}
              />
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className={cardTitle}>Notes</h2>
              {!notesEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotesEditing(true)}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {notesEditing ? (
                <div className="space-y-3">
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={saveNotes}
                      className="bg-[#F97316] text-white hover:bg-[#111827]"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNotes(vendor.notes ?? "");
                        setNotesEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-zinc-700">
                  {notes.trim() || "No notes yet."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={cn(cardClass, "lg:col-span-2")}>
            <CardHeader>
              <h2 className={cardTitle}>Relationship health score</h2>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div
                className={cn(
                  "flex size-28 flex-col items-center justify-center rounded-2xl ring-1",
                  relationshipHealthBg(health.tier)
                )}
              >
                <span
                  className={cn(
                    "text-4xl font-bold tabular-nums",
                    relationshipHealthColor(health.tier)
                  )}
                >
                  {health.score}
                </span>
                <span className="text-sm font-medium text-zinc-400">/100</span>
              </div>
              <p className="max-w-md text-sm text-zinc-600">
                Calculated automatically from linked contract health scores,
                number of active contracts, and this vendor&apos;s risk rating,
                critical, and single-source flags. This is separate from the
                manual risk rating above. Green 70–100, orange 40–69, red 0–39.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "contracts" ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">Total spend with vendor</p>
              <p className="text-2xl font-bold tabular-nums text-zinc-900">
                {formatSpend(totalSpend, baseCurrency)}
              </p>
            </div>
            {unlinkedData.length > 0 ? (
              <div className="flex flex-wrap items-end gap-2">
                <label className="block text-xs font-medium text-zinc-500">
                  Link existing contract
                  <select
                    className="mt-1 flex h-9 min-w-[200px] rounded-md border border-zinc-200 bg-white px-3 text-sm"
                    value={linkContractId}
                    onChange={(e) => setLinkContractId(e.target.value)}
                  >
                    <option value="">Select contract…</option>
                    {unlinkedData.map((row) => (
                      <option key={row.contract_id} value={row.contract_id}>
                        {row.vendor_name ?? "Contract"} —{" "}
                        {formatSpend(
                          Number(row.contract_value) || 0,
                          baseCurrency
                        )}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  disabled={!linkContractId || pending}
                  onClick={linkContract}
                  className="bg-[#F97316] text-white hover:bg-[#111827]"
                >
                  Link contract
                </Button>
              </div>
            ) : null}
          </div>

          {linkedData.length === 0 ? (
            <p className="text-sm text-zinc-500">No contracts linked yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {linkedData.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setSelectedContract(row);
                    setPanelOpen(true);
                  }}
                  className="rounded-xl border border-zinc-200/80 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <p className="font-semibold text-zinc-900">
                    {row.vendor_name ?? "Contract"}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900">
                    {formatSpend(
                      Number(row.contract_value) || 0,
                      row.currency ?? baseCurrency
                    )}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600">
                    <div>
                      <dt>Start</dt>
                      <dd>{formatDate(row.start_date)}</dd>
                    </div>
                    <div>
                      <dt>End</dt>
                      <dd>{formatDate(row.end_date)}</dd>
                    </div>
                    <div>
                      <dt>Renewal</dt>
                      <dd>{formatDate(row.renewal_date)}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <dt>Health</dt>
                      <dd>
                        <HealthScoreBadge row={row} />
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <ContractStatusBadge status={row.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="space-y-6">
          <form
            onSubmit={handleDocumentUpload}
            className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6"
          >
            <h2 className="flex items-center gap-2 font-sans text-base font-semibold text-zinc-900">
              <Upload className="size-4 text-[#F97316]" />
              Upload vendor document
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="file"
                name="file"
                required
                className="text-sm"
              />
              <select
                name="document_type"
                required
                className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
                defaultValue="insurance_certificate"
              >
                {VENDOR_DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                name="expiry_date"
                className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
                placeholder="Expiry"
              />
              <input
                type="text"
                name="name"
                placeholder="Display name (optional)"
                className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
              />
            </div>
            {uploadError ? (
              <p className="mt-2 text-sm text-red-600">{uploadError}</p>
            ) : null}
            <Button
              type="submit"
              disabled={pending}
              className="mt-4 bg-[#F97316] text-white hover:bg-[#111827]"
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              Upload
            </Button>
          </form>

          {documents.length === 0 ? (
            <p className="text-sm text-zinc-500">No documents uploaded yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => {
                const expiryStatus = documentExpiryStatus(doc.expiry_date);
                return (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm"
                  >
                    <FileText className="size-8 text-[#F97316]" />
                    <p className="mt-3 font-semibold text-zinc-900">
                      {doc.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDocumentType(doc.document_type)}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Uploaded {formatDate(doc.uploaded_at)}
                    </p>
                    {doc.expiry_date ? (
                      <p
                        className={cn(
                          "mt-1 text-xs font-medium",
                          expiryStatus === "expired" && "text-red-600",
                          expiryStatus === "soon" && "text-[#111827]",
                          !expiryStatus && "text-zinc-500"
                        )}
                      >
                        Expires {formatDate(doc.expiry_date)}
                        {expiryStatus === "expired"
                          ? " — expired"
                          : expiryStatus === "soon"
                            ? " — within 30 days"
                            : ""}
                      </p>
                    ) : null}
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const result = await getVendorDocumentSignedUrl(
                            doc.id,
                            vendor.id
                          );
                          if (result.url) {
                            window.open(result.url, "_blank");
                          } else {
                            window.alert(result.error);
                          }
                        }}
                      >
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={async () => {
                          if (!window.confirm("Delete this document?")) return;
                          const result = await deleteVendorDocument(
                            doc.id,
                            vendor.id
                          );
                          if (result.error) {
                            window.alert(result.error);
                            return;
                          }
                          setDocuments((prev) =>
                            prev.filter((d) => d.id !== doc.id)
                          );
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="relative ml-3 border-l border-zinc-200 pl-8">
          {activity.length === 0 ? (
            <p className="text-sm text-zinc-500">No activity recorded yet.</p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="relative pb-8 last:pb-0">
                <span className="absolute -left-[2.35rem] top-1.5 size-3 rounded-full border-2 border-white bg-[#F97316] ring-2 ring-orange-100" />
                <p className="text-sm text-zinc-900">{item.description}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Date(item.created_at).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      ) : null}

      <VendorFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        vendor={vendor}
        onSaved={() => router.refresh()}
      />

      <ContractDetailPanel
        contract={selectedContract}
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />
    </div>
  );
}

function Detail({
  label,
  value,
  link,
  children,
}: {
  label: string;
  value?: string | null;
  link?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-zinc-900">
        {children ??
          (value ? (
            link ? (
              <a
                href={value.startsWith("http") ? value : `https://${value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#111827] hover:underline"
              >
                {value}
              </a>
            ) : (
              value
            )
          ) : (
            "—"
          ))}
      </dd>
    </div>
  );
}

function ContactBlock({
  title,
  name,
  email,
  phone,
}: {
  title: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
}) {
  if (!name && !email && !phone) {
    return (
      <div>
        <p className="text-xs font-medium uppercase text-zinc-500">{title}</p>
        <p className="mt-1 text-zinc-400">—</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-medium uppercase text-zinc-500">{title}</p>
      {name ? <p className="mt-1 font-medium text-zinc-900">{name}</p> : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="mt-1 inline-flex items-center gap-1 text-sm text-[#111827] hover:underline"
        >
          <Mail className="size-3.5" />
          {email}
        </a>
      ) : null}
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="mt-1 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <Phone className="size-3.5" />
          {phone}
        </a>
      ) : null}
    </div>
  );
}
