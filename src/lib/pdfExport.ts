import { PDFDocument } from 'pdf-lib';
import { SignaturePlacement } from '@/components/PDFViewer';
import { ApprovalStep } from '@/types';

interface SignedStepData {
  step: ApprovalStep;
  placement: SignaturePlacement;
}

export async function generateSignedPdf(
  pdfUrl: string,
  placements: SignaturePlacement[],
  steps: ApprovalStep[]
): Promise<Uint8Array> {
  // Fetch the original PDF bytes
  const response = await fetch(pdfUrl);
  const pdfBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // For each approved step with a signature, embed it
  for (const step of steps) {
    if (step.status !== 'APPROVED' || !step.signature_path) continue;

    const placement = placements.find(
      (p) => p.approvalStepId === step.id || p.stepIndex === step.order_index
    );
    if (!placement) continue;

    // Get the page
    const pageIndex = placement.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue;
    const page = pdfDoc.getPage(pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Embed the signature image (PNG data URL)
    const sigDataUrl = step.signature_path;
    let sigImage;
    try {
      const sigBytes = dataUrlToBytes(sigDataUrl);
      if (sigDataUrl.includes('image/png')) {
        sigImage = await pdfDoc.embedPng(sigBytes);
      } else {
        sigImage = await pdfDoc.embedJpg(sigBytes);
      }
    } catch {
      continue; // Skip if image can't be embedded
    }

    // Convert percentage-based placement to PDF coordinates
    // PDF origin is bottom-left, but our placements use top-left origin
    const x = (Number(placement.x) / 100) * pageWidth;
    const w = (Number(placement.width) / 100) * pageWidth;
    const h = (Number(placement.height) / 100) * pageHeight;
    const y = pageHeight - ((Number(placement.y) / 100) * pageHeight) - h;

    page.drawImage(sigImage, { x, y, width: w, height: h });
  }

  return pdfDoc.save();
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
