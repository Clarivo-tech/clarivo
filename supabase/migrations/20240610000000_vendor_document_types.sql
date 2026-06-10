-- Expand vendor document type options

alter table public.vendor_documents
  drop constraint if exists vendor_documents_type_check;

alter table public.vendor_documents
  add constraint vendor_documents_type_check check (
    document_type in (
      'insurance_certificate',
      'iso_certification',
      'soc2_report',
      'nda',
      'dpa',
      'msa',
      'sow',
      'invoice',
      'sla',
      'pricing_records',
      'onboarding_form',
      'gdpr_privacy_compliance',
      'other'
    )
  );
