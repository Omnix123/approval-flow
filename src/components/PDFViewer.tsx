import { useState, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  Pen,
  Trash2,
  MousePointer,
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface SignaturePlacement {
  id: string;
  pageNumber: number;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage
  height: number; // percentage
  label?: string;
  stepIndex?: number;
}

interface PDFViewerProps {
  url: string;
  placements?: SignaturePlacement[];
  onPlacementAdd?: (placement: Omit<SignaturePlacement, 'id'>) => void;
  onPlacementRemove?: (id: string) => void;
  isEditing?: boolean;
  currentStepIndex?: number;
  readOnly?: boolean;
}

export function PDFViewer({
  url,
  placements = [],
  onPlacementAdd,
  onPlacementRemove,
  isEditing = false,
  currentStepIndex,
  readOnly = false,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [placementMode, setPlacementMode] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementMode || !pageRef.current || !onPlacementAdd) return;

      const rect = pageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      // Default signature box size (percentage of page)
      const width = 20;
      const height = 8;

      onPlacementAdd({
        pageNumber,
        x: Math.max(0, Math.min(x - width / 2, 100 - width)),
        y: Math.max(0, Math.min(y - height / 2, 100 - height)),
        width,
        height,
        stepIndex: currentStepIndex,
      });

      setPlacementMode(false);
    },
    [placementMode, pageNumber, onPlacementAdd, currentStepIndex]
  );

  const currentPagePlacements = placements.filter(
    (p) => p.pageNumber === pageNumber
  );

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[80px] text-center">
            Page {pageNumber} of {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.min(2, s + 0.25))}
            disabled={scale >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {isEditing && !readOnly && (
          <div className="flex items-center gap-2">
            <Button
              variant={placementMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlacementMode(!placementMode)}
            >
              {placementMode ? (
                <>
                  <MousePointer className="h-4 w-4 mr-1" />
                  Click to place
                </>
              ) : (
                <>
                  <Pen className="h-4 w-4 mr-1" />
                  Add Signature
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* PDF Display */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <div
            ref={pageRef}
            className={cn(
              'relative inline-block shadow-lg bg-white',
              placementMode && 'cursor-crosshair'
            )}
            onClick={handlePageClick}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={null}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>

            {/* Signature Placements Overlay */}
            {currentPagePlacements.map((placement) => (
              <div
                key={placement.id}
                className={cn(
                  'absolute border-2 rounded transition-all',
                  placement.stepIndex === currentStepIndex
                    ? 'border-primary bg-primary/10'
                    : 'border-success bg-success/10'
                )}
                style={{
                  left: `${placement.x}%`,
                  top: `${placement.y}%`,
                  width: `${placement.width}%`,
                  height: `${placement.height}%`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    {placement.label || `Sign Here`}
                  </span>
                </div>
                {isEditing && !readOnly && onPlacementRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlacementRemove(placement.id);
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Placement Mode Instructions */}
      {placementMode && (
        <div className="p-3 bg-primary/10 border-t border-primary/20 text-center">
          <p className="text-sm text-primary font-medium">
            Click on the document where you want to place a signature field
          </p>
        </div>
      )}
    </div>
  );
}
