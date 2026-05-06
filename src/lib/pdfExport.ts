/**
 * pdfExport.ts — Generate the final signed PDF
 *
 * Two responsibilities:
 *
 * 1) MERGE: combine every uploaded PDF into a single document, in the order
 *    the user uploaded them. The result behaves like ONE document with one
 *    continuous page sequence (SignWell / DocuSign style).
 *
 * 2) STAMP SIGNATURES: for each approved approval step, embed the approver's
 *    signature image into its placement box. The image is "aspect-fit" inside
 *    the box (like CSS `object-contain`) so it never stretches and never
 *    overflows — exactly how a real signature behaves when dropped in a field.
 *
 * Placement coordinates are stored as percentages of the *page* (0..100).
 * Each placement also carries `requestFileId` so we know which uploaded file
 * (and therefore which page-range inside the merged PDF) it belongs to.
 */

import { PDFDocument } from 'pdf-lib';
import { SignaturePlacement } from '@/components/PDFViewer';
import { ApprovalStep } from '@/types';

/** One uploaded PDF + its bytes, in the order it should appear in the merged file. */
export interface SourcePdf {
  /** request_files.id — used to map placements back to the right pages */
  fileId: string;
  /** Raw PDF bytes (already fetched via the inline-request-file edge function) */
  bytes: ArrayBuffer;
}

/**
 * Produce the final signed PDF.
 *
 * @param sources    All PDFs to merge, in upload order.
 * @param placements Signature boxes (percent-based) tagged with requestFileId.
 * @param steps      Approval steps; only APPROVED ones with a signature are stamped.
 */
export async function generateSignedPdf(
  sources: SourcePdf[],
  placements: SignaturePlacement[],
  steps: ApprovalStep[]
): Promise<Uint8Array> {
  const merged = await PDFDocument.create();

  // For each source PDF we remember WHERE its pages landed inside the merged doc.
  // Example: file A has 3 pages (merged pages 0..2), file B has 2 pages (merged pages 3..4).
  // pageOffsetByFile['A'] = 0, pageOffsetByFile['B'] = 3.
  const pageOffsetByFile: Record<string, number> = {};

  for (const src of sources) {
    const srcDoc = await PDFDocument.load(src.bytes);
    pageOffsetByFile[src.fileId] = merged.getPageCount();
    const copied = await merged.copyPages(srcDoc, srcDoc.getPageIndices());
    copied.forEach((p) => merged.addPage(p));
  }

  // Stamp every signed step into its placement box.
  for (const step of steps) {
    if (step.status !== 'APPROVED' || !step.signature_path) continue;

    const placement = placements.find(
      (p) => p.approvalStepId === step.id || p.stepIndex === step.order_index
    );
    if (!placement) continue;

    // Translate the per-file page number into the merged document's page index.
    // If the placement isn't tagged with a file, fall back to offset 0 (single-file case).
    const fileOffset = placement.requestFileId
      ? pageOffsetByFile[placement.requestFileId] ?? 0
      : 0;
    const pageIndex = fileOffset + (placement.pageNumber - 1);
    if (pageIndex < 0 || pageIndex >= merged.getPageCount()) continue;

    const page = merged.getPage(pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Embed the signature PNG/JPG once, then we can measure its natural size.
    let sigImage;
    try {
      const sigBytes = dataUrlToBytes(step.signature_path);
      sigImage = step.signature_path.includes('image/png')
        ? await merged.embedPng(sigBytes)
        : await merged.embedJpg(sigBytes);
    } catch {
      continue;
    }

    // Box rectangle in PDF points (top-left origin in our model).
    const boxX = (Number(placement.x) / 100) * pageWidth;
    const boxW = (Number(placement.width) / 100) * pageWidth;
    const boxH = (Number(placement.height) / 100) * pageHeight;
    const boxTop = (Number(placement.y) / 100) * pageHeight;

    // ASPECT-FIT (SignWell behaviour):
    // Scale the signature so it fits entirely inside the box while preserving
    // its original aspect ratio. Then center it horizontally + vertically.
    const sigW = sigImage.width;
    const sigH = sigImage.height;
    const scale = Math.min(boxW / sigW, boxH / sigH);
    const drawW = sigW * scale;
    const drawH = sigH * scale;

    const offsetX = boxX + (boxW - drawW) / 2;
    const offsetTop = boxTop + (boxH - drawH) / 2;

    // pdf-lib uses a bottom-left origin; convert from our top-left model.
    const drawY = pageHeight - offsetTop - drawH;

    page.drawImage(sigImage, { x: offsetX, y: drawY, width: drawW, height: drawH });
  }

  return merged.save();
}

/** Convert a `data:image/...;base64,...` string into raw bytes for pdf-lib. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
