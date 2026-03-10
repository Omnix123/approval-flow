/**
 * SignMobile.tsx — Mobile QR Code Signing Page
 * 
 * PURPOSE: Allows approvers to sign documents from their phone by scanning a QR code.
 * 
 * HOW IT WORKS:
 * 1. PC generates a QR token stored in the database with a 15-minute expiry
 * 2. Phone scans QR → opens this page with the token in the URL
 * 3. User draws signature on canvas
 * 4. Signature is saved to the database (qr_signing_tokens table)
 * 5. PC detects the update via realtime subscription and applies the signature
 * 
 * SECURITY:
 * - Tokens expire after 15 minutes
 * - Token can only be used once (completed = true)
 * - No authentication required (by design — phone may not be logged in)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Check, AlertCircle } from 'lucide-react';

export default function SignMobile() {
  const { token } = useParams<{ token: string }>();
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    
    supabase
      .from('qr_signing_tokens')
      .select('*')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return; }
        // Check expiry
        if (new Date(data.expires_at) < new Date() || data.completed) {
          setLoading(false);
          return;
        }
        setTokenData(data);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [tokenData]);

  const getCoords = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!canvasRef.current || !token || !tokenData) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');

    // Update the token in the database
    const { error } = await supabase
      .from('qr_signing_tokens')
      .update({ signature_data_url: dataUrl, completed: true })
      .eq('token', token);

    if (error) {
      console.error('Failed to submit signature:', error);
      return;
    }

    // Also update the approval step directly
    await supabase
      .from('approval_steps')
      .update({
        status: 'APPROVED' as any,
        signed_at: new Date().toISOString(),
        signature_path: dataUrl,
      })
      .eq('id', tokenData.step_id);

    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="font-medium">Invalid or expired signing link</p>
            <p className="text-sm text-muted-foreground mt-2">This link may have expired (15 min limit) or was already used.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <Check className="h-12 w-12 mx-auto text-success mb-4" />
            <p className="font-medium text-lg">Signature submitted!</p>
            <p className="text-muted-foreground mt-2">You can close this page now.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Sign Document</CardTitle>
          <CardDescription>Signing as <strong>{tokenData.approver_name}</strong></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="w-full touch-none cursor-crosshair"
              style={{ background: 'transparent' }}
              onMouseDown={startDraw}
              onMouseMove={onDraw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={onDraw}
              onTouchEnd={stopDraw}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground">Draw your signature here</p>
              </div>
            )}
            <div className="absolute bottom-8 left-8 right-8 border-b border-muted-foreground/30" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearCanvas} disabled={!hasSignature}>Clear</Button>
            <div className="flex-1" />
            <Button onClick={handleSubmit} disabled={!hasSignature}>
              <Check className="h-4 w-4 mr-1" />Submit Signature
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
