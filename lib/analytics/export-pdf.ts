import { format } from "date-fns";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export function analyticsPdfFilename(): string {
  return `clarivo-analytics-${format(new Date(), "yyyy-MM-dd")}.pdf`;
}

export async function exportAnalyticsReportToPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;
  const titleBlockHeight = 22;
  const firstPageContentHeight = pageHeight - margin - titleBlockHeight;
  const continuationPageHeight = pageHeight - margin * 2;

  pdf.setFontSize(16);
  pdf.setTextColor(24, 24, 27);
  pdf.text("Clarivo Analytics Report", margin, 14);
  pdf.setFontSize(9);
  pdf.setTextColor(113, 113, 122);
  pdf.text(`Generated ${format(new Date(), "d MMM yyyy, HH:mm")}`, margin, 20);

  let heightLeft = imgHeight;
  let offsetY = 0;

  pdf.addImage(
    imgData,
    "PNG",
    margin,
    titleBlockHeight,
    contentWidth,
    imgHeight
  );
  heightLeft -= firstPageContentHeight;

  while (heightLeft > 0) {
    offsetY += firstPageContentHeight;
    pdf.addPage();
    pdf.addImage(
      imgData,
      "PNG",
      margin,
      margin - offsetY,
      contentWidth,
      imgHeight
    );
    heightLeft -= continuationPageHeight;
    offsetY += continuationPageHeight - firstPageContentHeight;
  }

  pdf.save(filename);
}
