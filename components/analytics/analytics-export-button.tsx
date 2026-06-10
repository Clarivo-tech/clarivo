"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analyticsExportFilename,
  buildAnalyticsCsvExport,
  downloadCsvFile,
} from "@/lib/analytics/export-csv";
import {
  analyticsPdfFilename,
  exportAnalyticsReportToPdf,
} from "@/lib/analytics/export-pdf";
import type { ContractData } from "@/lib/types/contracts";
import { useCurrency } from "@/components/providers/currency-provider";

export function AnalyticsExportButton({
  contractData,
  reportRef,
}: {
  contractData: ContractData[];
  reportRef: React.RefObject<HTMLElement | null>;
}) {
  const { convert, baseCurrency } = useCurrency();
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const disabled = contractData.length === 0;
  const busy = exportingCsv || exportingPdf;

  function handleCsvExport() {
    if (disabled || busy) return;

    setExportingCsv(true);
    try {
      const csv = buildAnalyticsCsvExport({
        rows: contractData,
        convert,
        baseCurrency,
      });
      downloadCsvFile(analyticsExportFilename(), csv);
    } finally {
      setExportingCsv(false);
    }
  }

  async function handlePdfExport() {
    if (disabled || busy || !reportRef.current) return;

    setExportingPdf(true);
    try {
      await exportAnalyticsReportToPdf(
        reportRef.current,
        analyticsPdfFilename()
      );
    } catch (error) {
      console.error("[analytics] PDF export failed:", error);
      const message =
        error instanceof Error ? error.message : "Unknown error";
      window.alert(
        `Could not generate PDF. ${message || "Please try again."}`
      );
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        className="h-10 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
        onClick={handleCsvExport}
      >
        {exportingCsv ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Exporting…
          </>
        ) : (
          <>
            <Download className="size-4" />
            Export CSV
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        className="h-10 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
        onClick={handlePdfExport}
      >
        {exportingPdf ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Exporting…
          </>
        ) : (
          <>
            <FileText className="size-4" />
            Export PDF
          </>
        )}
      </Button>
    </div>
  );
}
