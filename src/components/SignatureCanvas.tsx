import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSavedSignature, saveSignature } from '@/lib/signatureStore';
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

  const savedSig = user ? getSavedSignature(user.id) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Transparent background
    ctx.clearRect(0, 0, width, height);
  }, [width, height]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

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

  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasSignature && canvasRef.current && onSignatureChange) {
      onSignatureChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    setHasSignature(false);
    onSignatureChange?.(null);
  };

  const handleSaveSignature = () => {
    if (!canvasRef.current || !user) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    saveSignature(user.id, dataUrl);
    toast.success('Signature saved! You can reuse it next time.');
  };

  const handleUseSaved = () => {
    if (!savedSig) return;
    // Draw saved signature onto canvas
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

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
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm">Sign here</p>
          </div>
        )}
        <div className="absolute bottom-8 left-8 right-8 border-b border-muted-foreground/30" />
        <p className="absolute bottom-2 left-8 text-xs text-muted-foreground">Sign above the line</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={clearCanvas} disabled={!hasSignature}>
          <RotateCcw className="h-4 w-4 mr-1" />Clear
        </Button>
        {showSavedOption && hasSignature && user && (
          <Button variant="outline" size="sm" onClick={handleSaveSignature}>
            <Save className="h-4 w-4 mr-1" />Save Signature
          </Button>
        )}
        {showSavedOption && savedSig && (
          <Button variant="outline" size="sm" onClick={handleUseSaved}>
            Use Saved Signature
          </Button>
        )}
      </div>
    </div>
  );
}
