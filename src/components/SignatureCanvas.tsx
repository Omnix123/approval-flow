/**
 * SignatureCanvas.tsx — Digital Signature Drawing Component
 * 
 * PURPOSE: Provides an HTML5 Canvas-based signature pad where users can draw
 * their signature using mouse or touch input. The signature is captured as a
 * PNG data URL (base64-encoded image) that can be stored in the database.
 * 
 * HOW IT WORKS:
 * 1. User draws on the canvas using mouse drag or finger touch
 * 2. Each stroke is rendered in real-time using Canvas 2D drawing API
 * 3. When the user lifts their mouse/finger, the canvas is exported as a data URL
 * 4. The data URL is passed to the parent component via onSignatureChange callback
 * 
 * FEATURES:
 * - Mouse AND touch support (works on desktop and mobile)
 * - "Clear" button to reset the canvas
 * - "Save Signature" — stores in localStorage for reuse across sessions
 * - "Use Saved Signature" — loads a previously saved signature
 * - Transparent background — signature can be overlaid on documents
 * 
 * COORDINATE SCALING:
 * The canvas has a fixed internal resolution (e.g., 400x150 pixels) but is
 * CSS-scaled to fill its container. The getCoordinates() function translates
 * mouse/touch positions from screen space to canvas space using the scale ratio.
 * 
 * USED BY: RequestDetail (sign dialog), DocumentViewer, SignMobile
 */

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSavedSignature, saveSignature } from '@/lib/signatureStore';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SignatureCanvasProps {
  onSignatureChange?: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
  showSavedOption?: boolean;
}

export function SignatureCanvas({
  onSignatureChange,
  width = 400,
  height = 150,
  className,
  showSavedOption = true,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const { user } = useAuth();

  // Check if user has a saved signature in localStorage
  const savedSig = user ? getSavedSignature(user.id) : null;

  /**
   * Initialize the canvas context with drawing settings.
   * Runs once when the component mounts or dimensions change.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set stroke style for signature appearance
    ctx.strokeStyle = '#1a365d';     // Dark navy blue — professional signature color
    ctx.lineWidth = 2;                // Thin line for natural handwriting feel
    ctx.lineCap = 'round';           // Rounded line endings
    ctx.lineJoin = 'round';          // Smooth line joins

    // Start with a clear (transparent) canvas
    ctx.clearRect(0, 0, width, height);
  }, [width, height]);

  /**
   * Translate screen coordinates to canvas coordinates.
   * Necessary because the canvas may be CSS-scaled (responsive width).
   * Without this, drawing would be offset on non-1:1 scaled canvases.
   */
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;    // Horizontal scale factor
    const scaleY = canvas.height / rect.height;  // Vertical scale factor

    if ('touches' in e) {
      // Touch event (mobile)
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    // Mouse event (desktop)
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  /** Start a new stroke when mouse/touch begins */
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();  // Prevent scrolling on touch devices
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  /** Continue the current stroke as mouse/touch moves */
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  /** End the current stroke and export the signature */
  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasSignature && canvasRef.current && onSignatureChange) {
      // Export canvas as a PNG data URL (base64-encoded image)
      onSignatureChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  /** Clear the canvas and reset state */
  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    setHasSignature(false);
    onSignatureChange?.(null);
  };

  /** Save the current signature to localStorage for reuse */
  const handleSaveSignature = () => {
    if (!canvasRef.current || !user) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    saveSignature(user.id, dataUrl);
    toast.success('Signature saved! You can reuse it next time.');
  };

  /** Load a previously saved signature onto the canvas */
  const handleUseSaved = () => {
    if (!savedSig) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Create an Image element, load the saved data URL, and draw it on canvas
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      setHasSignature(true);
      onSignatureChange?.(savedSig);
    };
    img.src = savedSig;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Canvas drawing area */}
      <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden" style={{ background: 'transparent' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair"
          style={{ background: 'transparent' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {/* Placeholder text when canvas is empty */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm">Sign here</p>
          </div>
        )}
        {/* Signature line (visual guide) */}
        <div className="absolute bottom-8 left-8 right-8 border-b border-muted-foreground/30" />
        <p className="absolute bottom-2 left-8 text-xs text-muted-foreground">Sign above the line</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={clearCanvas} disabled={!hasSignature}>
          <RotateCcw className="h-4 w-4 mr-1" />Clear
        </Button>
        {/* Save button — appears after drawing a signature */}
        {showSavedOption && hasSignature && user && (
          <Button variant="outline" size="sm" onClick={handleSaveSignature}>
            <Save className="h-4 w-4 mr-1" />Save Signature
          </Button>
        )}
        {/* "Use Saved" button — appears if a saved signature exists */}
        {showSavedOption && savedSig && (
          <Button variant="outline" size="sm" onClick={handleUseSaved}>
            Use Saved Signature
          </Button>
        )}
      </div>
    </div>
  );
}
