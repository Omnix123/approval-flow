/**
 * signatureImage.ts — Signature image normalization helpers
 *
 * The drawing canvases render at devicePixelRatio for sharp touch/stylus input.
 * That internal canvas is intentionally larger than its CSS size, so exporting it
 * directly would store a DPR-scaled image. These helpers convert the canvas back
 * to logical pixels before saving and optionally trim empty transparent margins.
 */

interface ExportSignatureOptions {
  /** Remove transparent whitespace around the ink before saving. */
  trim?: boolean;
  /** Logical-pixel padding to keep around trimmed ink so strokes are not clipped. */
  padding?: number;
}

/**
 * Export a signature canvas without devicePixelRatio scaling.
 *
 * Example: a 400x150 signature pad on a DPR=2 phone has an 800x300 backing
 * canvas. This function exports a normal logical image, not the 800x300 backing
 * buffer, so PDF placement math stays exact.
 */
export function exportNormalizedSignature(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
  options: ExportSignatureOptions = {}
): string | null {
  const sourceWidth = canvas.width;
  const sourceHeight = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || sourceWidth <= 0 || sourceHeight <= 0) return null;

  let sourceX = 0;
  let sourceY = 0;
  let trimWidth = sourceWidth;
  let trimHeight = sourceHeight;
  let outputWidth = logicalWidth;
  let outputHeight = logicalHeight;

  if (options.trim) {
    const imageData = ctx.getImageData(0, 0, sourceWidth, sourceHeight).data;
    let minX = sourceWidth;
    let minY = sourceHeight;
    let maxX = -1;
    let maxY = -1;

    // Detect all non-transparent pixels. The low alpha threshold avoids missing
    // antialiased stroke edges while still ignoring fully transparent canvas area.
    for (let y = 0; y < sourceHeight; y++) {
      for (let x = 0; x < sourceWidth; x++) {
        const alpha = imageData[(y * sourceWidth + x) * 4 + 3];
        if (alpha > 4) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX === -1 || maxY === -1) return null;

    const ratioX = sourceWidth / logicalWidth;
    const ratioY = sourceHeight / logicalHeight;
    const padX = Math.round((options.padding ?? 8) * ratioX);
    const padY = Math.round((options.padding ?? 8) * ratioY);

    sourceX = Math.max(0, minX - padX);
    sourceY = Math.max(0, minY - padY);
    const right = Math.min(sourceWidth - 1, maxX + padX);
    const bottom = Math.min(sourceHeight - 1, maxY + padY);
    trimWidth = Math.max(1, right - sourceX + 1);
    trimHeight = Math.max(1, bottom - sourceY + 1);

    // Convert the trimmed physical DPR rectangle back to logical pixels.
    outputWidth = Math.max(1, Math.round(trimWidth / ratioX));
    outputHeight = Math.max(1, Math.round(trimHeight / ratioY));
  }

  const output = document.createElement('canvas');
  output.width = outputWidth;
  output.height = outputHeight;

  const outputCtx = output.getContext('2d');
  if (!outputCtx) return null;

  outputCtx.drawImage(
    canvas,
    sourceX,
    sourceY,
    trimWidth,
    trimHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return output.toDataURL('image/png');
}

/** Draw an image centered inside a logical canvas area without stretching it. */
export function drawImageAspectContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  logicalWidth: number,
  logicalHeight: number
) {
  const scale = Math.min(logicalWidth / image.width, logicalHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (logicalWidth - drawWidth) / 2;
  const y = (logicalHeight - drawHeight) / 2;

  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}