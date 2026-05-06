import { useState, useCallback, useRef, useEffect } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignaturePlacement } from './PDFViewer';

interface ResizablePlacementProps {
  placement: SignaturePlacement;
  isEditing: boolean;
  isCurrentStep: boolean;
  isSigned: boolean;
  signedOverlay?: { signatureDataUrl: string; approverName: string };
  canResize?: boolean;
  canMove?: boolean;
  onRemove?: (id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onMove?: (id: string, x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function ResizablePlacement({
  placement,
  isEditing,
  isCurrentStep,
  isSigned,
  signedOverlay,
  canResize = false,
  canMove = false,
  onRemove,
  onResize,
  onMove,
  containerRef,
}: ResizablePlacementProps) {
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0, w: placement.width, h: placement.height, px: placement.x, py: placement.y });

  // --- Resize ---
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizing(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startPos.current = { x: clientX, y: clientY, w: placement.width, h: placement.height, px: placement.x, py: placement.y };
    },
    [placement.width, placement.height, placement.x, placement.y]
  );

  useEffect(() => {
    if (!resizing) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = container.getBoundingClientRect();
      const dx = ((clientX - startPos.current.x) / rect.width) * 100;
      const dy = ((clientY - startPos.current.y) / rect.height) * 100;
      const newW = Math.max(0.1, Math.min(100, startPos.current.w + dx));
      const newH = Math.max(0.1, Math.min(100, startPos.current.h + dy));
      onResize?.(placement.id, newW, newH);
    };
    const handleUp = () => setResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [resizing, containerRef, onResize, placement.id]);

  // --- Drag to move ---
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setDragging(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startPos.current = { x: clientX, y: clientY, w: placement.width, h: placement.height, px: placement.x, py: placement.y };
    },
    [placement.x, placement.y, placement.width, placement.height]
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = container.getBoundingClientRect();
      const dx = ((clientX - startPos.current.x) / rect.width) * 100;
      const dy = ((clientY - startPos.current.y) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100 - startPos.current.w, startPos.current.px + dx));
      const newY = Math.max(0, Math.min(100 - startPos.current.h, startPos.current.py + dy));
      onMove?.(placement.id, newX, newY);
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging, containerRef, onMove, placement.id]);

  if (isSigned && signedOverlay) {
    return (
      <div
        className={cn('absolute rounded group', (dragging) && 'ring-2 ring-primary/50')}
        style={{
          left: `${placement.x}%`,
          top: `${placement.y}%`,
          width: `${placement.width}%`,
          height: `${placement.height}%`,
        }}
      >
        {/*
          Signature image is auto-fit to the placement box (SignWell-style):
          - object-contain preserves the original aspect ratio of the drawn signature
          - The image is centered inside the box (no stretching, no overflow)
          This matches how the signature is embedded in the exported PDF (aspect-fit).
        */}
        <img
          src={signedOverlay.signatureDataUrl}
          alt={`Signature by ${signedOverlay.approverName}`}
          className="w-full h-full object-contain"
        />
        <div className="absolute -bottom-5 left-0 right-0 text-center">
          <span className="text-[10px] font-medium text-success bg-white/80 px-1 rounded">
            ✓ {signedOverlay.approverName}
          </span>
        </div>
        {/* Drag handle for signed signatures */}
        {canMove && onMove && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 p-0.5 bg-primary text-primary-foreground rounded shadow-md cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            title="Drag to reposition"
          >
            <GripVertical className="h-3 w-3" />
          </div>
        )}

        {canResize && onResize && (
          <div
            className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-tl cursor-se-resize z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            title="Resize signature"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'absolute border-2 border-dashed rounded transition-colors group',
        isCurrentStep ? 'border-primary bg-primary/10' : 'border-muted-foreground/40 bg-muted/5',
        (dragging || resizing) && 'ring-2 ring-primary/50'
      )}
      style={{
        left: `${placement.x}%`,
        top: `${placement.y}%`,
        width: `${placement.width}%`,
        height: `${placement.height}%`,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground select-none">
          {placement.label || 'Sign Here'}
        </span>
      </div>

      {/* Drag handle - center top */}
      {(isEditing || canMove) && onMove && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 p-0.5 bg-primary text-primary-foreground rounded shadow-md cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          title="Drag to move"
        >
          <GripVertical className="h-3 w-3" />
        </div>
      )}

      {isEditing && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(placement.id); }}
          className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90 transition-colors z-10"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}

      {(isEditing || canResize) && onResize && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-tl cursor-se-resize z-10"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        />
      )}
    </div>
  );
}
