const resumePdfFileName = "sangmin-lee-resume.pdf";
const resumeWithCareerDetailsPdfFileName = "sangmin-lee-resume-with-career-details.pdf";
const exportBackgroundColor = "#f7f6f3";
const pageMarginY = 8;

const waitForNextPaint = () => {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
};

const getPageBreakCandidates = (resumeDocument: HTMLElement, canvas: HTMLCanvasElement) => {
  const documentBounds = resumeDocument.getBoundingClientRect();
  const scale = canvas.width / documentBounds.width;

  return Array.from(
    resumeDocument.querySelectorAll<HTMLElement>(
      ".resume-preview-career, .resume-preview-project, .resume-preview-description, .resume-preview-career-detail-content h2, .resume-preview-career-detail-content p, li",
    ),
  )
    .map(element => Math.round((element.getBoundingClientRect().top - documentBounds.top) * scale))
    .sort((firstCandidate, secondCandidate) => firstCandidate - secondCandidate);
};

const findPageBreak = (
  canvas: HTMLCanvasElement,
  startY: number,
  maximumHeight: number,
  pageBreakCandidates: number[],
) => {
  const expectedEnd = Math.min(startY + maximumHeight, canvas.height);

  if (expectedEnd === canvas.height) {
    return expectedEnd - startY;
  }

  const minimumBreakY = startY + Math.floor(maximumHeight * 0.7);
  const eligibleBreaks = pageBreakCandidates.filter(
    candidate => candidate > minimumBreakY && candidate <= expectedEnd,
  );
  const preferredBreak = eligibleBreaks[eligibleBreaks.length - 1];

  if (preferredBreak) {
    return preferredBreak - startY;
  }

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return expectedEnd - startY;
  }

  const imageData = context.getImageData(
    0,
    minimumBreakY,
    canvas.width,
    expectedEnd - minimumBreakY,
  );
  const pixelStep = 4;
  let lastBlankRow = 0;

  for (let row = 0; row < imageData.height; row += 1) {
    let isBlankRow = true;

    for (let column = 0; column < imageData.width; column += pixelStep) {
      const pixelIndex = (row * imageData.width + column) * 4;
      const red = imageData.data[pixelIndex];
      const green = imageData.data[pixelIndex + 1];
      const blue = imageData.data[pixelIndex + 2];

      if (Math.abs(red - 247) > 8 || Math.abs(green - 246) > 8 || Math.abs(blue - 243) > 8) {
        isBlankRow = false;
        break;
      }
    }

    if (isBlankRow) {
      lastBlankRow = row;
    }
  }

  return lastBlankRow > 0 ? minimumBreakY + lastBlankRow - startY : expectedEnd - startY;
};

const createPageCanvas = (canvas: HTMLCanvasElement, sourceY: number, sourceHeight: number) => {
  const pageCanvas = document.createElement("canvas");
  pageCanvas.width = canvas.width;
  pageCanvas.height = sourceHeight;

  const context = pageCanvas.getContext("2d");

  if (!context) {
    throw new Error("PDF page canvas context is unavailable.");
  }

  context.fillStyle = exportBackgroundColor;
  context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
  context.drawImage(
    canvas,
    0,
    sourceY,
    canvas.width,
    sourceHeight,
    0,
    0,
    pageCanvas.width,
    pageCanvas.height,
  );

  return pageCanvas;
};

export const downloadResumePdf = async (
  resumeDocument: HTMLElement,
  careerDetailDocuments: HTMLElement[] = [],
) => {
  const pdfDocuments = [resumeDocument, ...careerDetailDocuments];

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const pdf = new jsPDF({
      compress: true,
      format: "a4",
      orientation: "portrait",
      unit: "mm",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const printableHeight = pageHeight - pageMarginY * 2;
    let pageIndex = 0;

    for (const pdfDocument of pdfDocuments) {
      pdfDocument.classList.add("resume-preview-document--exporting");
      await waitForNextPaint();

      const canvas = await html2canvas(pdfDocument, {
        backgroundColor: exportBackgroundColor,
        logging: false,
        scale: 2,
        useCORS: true,
      });
      const maximumSourceHeight = Math.floor((printableHeight / pageWidth) * canvas.width);
      const pageBreakCandidates = getPageBreakCandidates(pdfDocument, canvas);
      let sourceY = 0;

      pdfDocument.classList.remove("resume-preview-document--exporting");

      while (sourceY < canvas.height) {
        const sourceHeight = findPageBreak(
          canvas,
          sourceY,
          maximumSourceHeight,
          pageBreakCandidates,
        );
        const pageCanvas = createPageCanvas(canvas, sourceY, sourceHeight);
        const imageHeight = (sourceHeight / canvas.width) * pageWidth;

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.setFillColor(247, 246, 243);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        pdf.addImage(
          pageCanvas.toDataURL("image/png"),
          "PNG",
          0,
          pageMarginY,
          pageWidth,
          imageHeight,
        );

        sourceY += sourceHeight;
        pageIndex += 1;
      }

      canvas.width = 0;
      canvas.height = 0;
    }

    pdf.save(
      careerDetailDocuments.length > 0 ? resumeWithCareerDetailsPdfFileName : resumePdfFileName,
    );
  } finally {
    pdfDocuments.forEach(pdfDocument => {
      pdfDocument.classList.remove("resume-preview-document--exporting");
    });
  }
};
