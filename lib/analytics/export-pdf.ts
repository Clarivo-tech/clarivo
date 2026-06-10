import { format } from "date-fns";

export function analyticsPdfFilename(): string {
  return `clarivo-analytics-${format(new Date(), "yyyy-MM-dd")}.pdf`;
}

const MAX_CANVAS_DIMENSION = 8192;

async function loadCaptureLibs() {
  const [html2canvasModule, jsPdfModule] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  return {
    html2canvas: html2canvasModule.default,
    jsPDF: jsPdfModule.jsPDF,
  };
}

function getCaptureScale(width: number, height: number): number {
  let scale = 1.5;
  while (
    scale > 1 &&
    (width * scale > MAX_CANVAS_DIMENSION ||
      height * scale > MAX_CANVAS_DIMENSION)
  ) {
    scale -= 0.25;
  }
  return scale;
}

async function captureElement(
  element: HTMLElement,
  html2canvas: (typeof import("html2canvas-pro"))["default"]
): Promise<HTMLCanvasElement> {
  const scale = getCaptureScale(element.scrollWidth, element.scrollHeight);

  return html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.clientWidth,
  });
}

function canvasToImage(canvas: HTMLCanvasElement): {
  data: string;
  format: "JPEG" | "PNG";
  width: number;
  height: number;
} {
  try {
    return {
      data: canvas.toDataURL("image/jpeg", 0.92),
      format: "JPEG",
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    return {
      data: canvas.toDataURL("image/png"),
      format: "PNG",
      width: canvas.width,
      height: canvas.height,
    };
  }
}

function appendImageToPdf(
  pdf: InstanceType<(typeof import("jspdf"))["jsPDF"]>,
  image: { data: string; format: "JPEG" | "PNG"; width: number; height: number },
  margin: number,
  startY: number
): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const scaledHeight = (image.height * contentWidth) / image.width;

  let heightLeft = scaledHeight;
  let offsetY = 0;
  let y = startY;

  if (y + 12 > pageHeight - margin) {
    pdf.addPage();
    y = margin;
  }

  pdf.addImage(image.data, image.format, margin, y, contentWidth, scaledHeight);
  heightLeft -= pageHeight - y - margin;
  offsetY = pageHeight - y - margin;

  while (heightLeft > 0) {
    pdf.addPage();
    pdf.addImage(
      image.data,
      image.format,
      margin,
      margin - offsetY,
      contentWidth,
      scaledHeight
    );
    heightLeft -= pageHeight - margin * 2;
    offsetY += pageHeight - margin * 2;
  }

  const remainder = scaledHeight % (pageHeight - margin * 2);
  const usedHeight =
    remainder === 0 ? pageHeight - margin * 2 : remainder;
  const nextY = y + usedHeight + 8;

  if (nextY > pageHeight - margin - 20) {
    return margin;
  }

  return nextY;
}

export async function exportAnalyticsReportToPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const { html2canvas, jsPDF } = await loadCaptureLibs();
  const pdf = new jsPDF("p", "mm", "a4");
  const margin = 10;

  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  await new Promise((resolve) => window.setTimeout(resolve, 150));

  pdf.setFontSize(16);
  pdf.setTextColor(24, 24, 27);
  pdf.text("Clarivo Analytics Report", margin, 14);
  pdf.setFontSize(9);
  pdf.setTextColor(113, 113, 122);
  pdf.text(`Generated ${format(new Date(), "d MMM yyyy, HH:mm")}`, margin, 20);

  let currentY = 28;
  const sections = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  );

  const targets = sections.length > 0 ? sections : [element];

  for (const section of targets) {
    const canvas = await captureElement(section, html2canvas);
    if (canvas.width === 0 || canvas.height === 0) {
      continue;
    }

    const image = canvasToImage(canvas);
    currentY = appendImageToPdf(pdf, image, margin, currentY);

    if (currentY <= margin + 8 && targets.length > 1) {
      pdf.addPage();
      currentY = margin;
    }
  }

  pdf.save(filename);
}
