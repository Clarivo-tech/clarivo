import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { getVendorById } from "@/lib/data/vendors";
import type { VendorDocumentType } from "@/lib/types/vendors";
import { VENDOR_DOCUMENT_TYPES } from "@/lib/vendors/constants";

const BUCKET = "vendors";
const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_TYPES = VENDOR_DOCUMENT_TYPES.map((t) => t.value);

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]/g, "_");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const { id: vendorId } = await params;
  const vendor = await getVendorById(auth.supabase, auth.user.id, vendorId);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const documentType = formData.get("document_type") as string;
  const expiryDate = formData.get("expiry_date") as string | null;
  const displayName = (formData.get("name") as string | null)?.trim();

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please provide a file." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File must be 15MB or smaller." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(documentType as VendorDocumentType)) {
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  }

  const safeName = sanitizeFileName(file.name.trim() || "document");
  const storagePath = `${vendorId}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await auth.supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: doc, error: dbError } = await auth.supabase
    .from("vendor_documents")
    .insert({
      vendor_id: vendorId,
      user_id: auth.user.id,
      name: displayName || file.name,
      document_type: documentType,
      storage_path: storagePath,
      file_size: file.size,
      expiry_date: expiryDate?.trim() || null,
    })
    .select("*")
    .single();

  if (dbError) {
    await auth.supabase.storage.from(BUCKET).remove([storagePath]);
    const message = dbError.message.includes("vendor_documents_type_check")
      ? "This document type is not enabled in the database yet. Run the vendor document types migration in Supabase (see supabase/migrations/20240610000000_vendor_document_types.sql), or choose Insurance, NDA, DPA, or Other for now."
      : dbError.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await auth.supabase.from("vendor_activity").insert({
    vendor_id: vendorId,
    user_id: auth.user.id,
    action_type: "document_uploaded",
    description: `Document "${doc.name}" uploaded.`,
  });

  revalidatePath(`/dashboard/vendors/${vendorId}`);
  return NextResponse.json({ success: true, document: doc });
}
