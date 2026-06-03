"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analyticsExportFilename,
  buildAnalyticsCsvExport,
  downloadCsvFile,
} from "@/lib/analytics/export-csv";
import type { ContractData } from "@/lib/types/contracts";
import { useCurrency } from "@/components/providers/currency-provider";

export function AnalyticsExportButton({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const { convert, baseCurrency } = useCurrency();
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    if (contractData.length === 0) return;

    setExporting(true);
    try {
      const csv = buildAnalyticsCsvExport({
        rows: contractData,
        convert,
        baseCurrency,
      });
      downloadCsvFile(analyticsExportFilename(), csv);
    } finally {
      setExporting(false);
    }
  }

  const disabled = exporting || contractData.length === 0;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className="h-10 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
      onClick={handleExport}
    >
      {exporting ? (
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
  );
}
