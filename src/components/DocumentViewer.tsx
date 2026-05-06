import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { PDFViewer, SignaturePlacement } from './PDFViewer';
import { SignatureCanvas } from './SignatureCanvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ApprovalStep } from '@/types';
import { Check, Pen, FileText, Download, QrCode, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { generateSignedPdf } from '@/lib/pdfExport';
import { createQrToken } from '@/lib/signatureStore';
import { QRCodeSVG } from 'qrcode.react';

interface DocumentViewerProps {
  documentUrl: string;
  steps: ApprovalStep[];
  currentUserStepId?: string;
  onSign?: (signatureDataUrl: string, placements: SignaturePlacement[]) => void;
  isEditing?: boolean;
  placements?: SignaturePlacement[];
  requestId?: string;
  allowPlacementAdjustments?: boolean;
  onPlacementUpdate?: (placementId: string, updates: Pick<SignaturePlacement, 'x' | 'y' | 'width' | 'height'>) => void;
  /**
   * Async loader that returns ALL of the request's PDFs (in upload order),
   * each as { fileId, bytes }. Called only when the user clicks
   * "Download Signed PDF" — this is when the merge happens.
   */
  loadAllPdfSources?: () => Promise<import('@/lib/pdfExport').SourcePdf[]>;
}

function resolveDocumentUrl(url: string) {
  if (!url) return '';
  // Documents must only be rendered from browser-created blob URLs.
  // Raw storage/public/signed URLs can carry download headers and trigger IDM/browser downloads.
  if (url.startsWith('blob:')) return url;
  return '';
}

export function DocumentViewer({
  documentUrl,
  steps,
  currentUserStepId,
  onSign,
  isEditing = false,
  placements: externalPlacements,
  requestId,
  allowPlacementAdjustments = false,
  onPlacementUpdate,
}: DocumentViewerProps) {
  const [editPlacements, setEditPlacements] = useState<SignaturePlacement[]>(externalPlacements || []);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const qrTokenRef = useRef<string | null>(null);

  const currentStep = steps.find((s) => s.id === currentUserStepId);
  const currentStepIndex = currentStep?.order_index;

  const resolvedUrl = useMemo(() => resolveDocumentUrl(documentUrl), [documentUrl]);

  useEffect(() => {
    if (externalPlacements) {
      setEditPlacements(externalPlacements);
    }
  }, [externalPlacements]);

  const displayPlacements = editPlacements;

  const signedOverlays = useMemo(() => {
    return steps
      .filter((s) => s.status === 'APPROVED' && s.signature_path)
      .map((s) => {
        const placement = displayPlacements.find(
          (p) => p.approvalStepId === s.id || p.stepIndex === s.order_index
        );
        if (!placement) return null;
        return { placement, signatureDataUrl: s.signature_path!, approverName: s.approver_name };
      })
      .filter(Boolean) as { placement: SignaturePlacement; signatureDataUrl: string; approverName: string }[];
  }, [steps, displayPlacements]);

  const allApproved = steps.length > 0 && steps.every((s) => s.status === 'APPROVED');

  const handleAddPlacement = useCallback(
    (placement: Omit<SignaturePlacement, 'id'>) => {
      const newPlacement: SignaturePlacement = {
        ...placement,
        id: `placement-${Date.now()}`,
        label: currentStep ? `${currentStep.approver_name}` : 'Signature',
      };
      setEditPlacements((prev) => [...prev, newPlacement]);
      toast.success('Signature field added — drag the grip handle to reposition it');
    },
    [currentStep]
  );

  const handleRemovePlacement = useCallback((id: string) => {
    setEditPlacements((prev) => prev.filter((p) => p.id !== id));
    toast.success('Signature field removed');
  }, []);

  const handleResizePlacement = useCallback((id: string, width: number, height: number) => {
    setEditPlacements((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, width, height } : p);
      const updated = next.find((p) => p.id === id);
      if (updated) {
        onPlacementUpdate?.(id, {
          x: updated.x,
          y: updated.y,
          width: updated.width,
          height: updated.height,
        });
      }
      return next;
    });
  }, [onPlacementUpdate]);

  const handleMovePlacement = useCallback((id: string, x: number, y: number) => {
    setEditPlacements((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, x, y } : p);
      const updated = next.find((p) => p.id === id);
      if (updated) {
        onPlacementUpdate?.(id, {
          x: updated.x,
          y: updated.y,
          width: updated.width,
          height: updated.height,
        });
      }
      return next;
    });
  }, [onPlacementUpdate]);

  const handleSignDocument = () => {
    if (!signatureDataUrl) {
      toast.error('Please draw your signature first');
      return;
    }
    onSign?.(signatureDataUrl, displayPlacements);
    setSignDialogOpen(false);
    toast.success('Document signed successfully!');
  };

  const handleDownloadSigned = async () => {
    if (!resolvedUrl || displayPlacements.length === 0) return;
    setIsDownloading(true);
    try {
      const pdfBytes = await generateSignedPdf(resolvedUrl, displayPlacements, steps);
      const blob = new Blob([new Uint8Array(pdfBytes as any)], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'signed_document.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Signed PDF downloaded');
    } catch (err) {
      toast.error('Failed to generate signed PDF');
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Create QR token only when user clicks "Sign with Phone"
  const handleOpenQrDialog = useCallback(() => {
    if (!requestId || !currentStep) return;
    if (!qrTokenRef.current) {
      qrTokenRef.current = createQrToken(requestId, currentStep.id, currentStep.approver_name);
      setQrToken(qrTokenRef.current);
    }
    setQrDialogOpen(true);
  }, [requestId, currentStep]);

  // Use current hostname so QR works on local network (e.g. 192.168.x.x:5173)
  const qrUrl = qrToken ? `${window.location.origin}/sign-mobile/${qrToken}` : '';

  // Listen for QR signature completion via BroadcastChannel
  useEffect(() => {
    if (!qrToken || !currentStep || !requestId) return;
    const bc = new BroadcastChannel('ema_qr_signing');
    bc.onmessage = (event) => {
      const { token, signatureDataUrl: sigData } = event.data;
      if (token === qrToken && sigData) {
        onSign?.(sigData, editPlacements);
        setQrDialogOpen(false);
        toast.success('Signature received from mobile device!');
        qrTokenRef.current = null;
        setQrToken(null);
      }
    };
    return () => bc.close();
  }, [qrToken, currentStep, requestId, onSign, editPlacements]);

  const handleCopyLink = () => {
    if (qrUrl) {
      navigator.clipboard.writeText(qrUrl);
      toast.success('Link copied! Open it in a new tab or send to your phone');
    }
  };

  const handleOpenNewTab = () => {
    if (qrUrl) window.open(qrUrl, '_blank');
  };

  const canSign = currentUserStepId && currentStep?.status === 'WAITING';

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />Document Preview
            </CardTitle>
            <div className="flex items-center gap-2">
              {allApproved && displayPlacements.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleDownloadSigned} disabled={isDownloading}>
                  <Download className="h-4 w-4 mr-1" />
                  {isDownloading ? 'Generating...' : 'Download Signed PDF'}
                </Button>
              )}
              {canSign && onSign && (
                <>
                  <Button size="sm" variant="outline" onClick={handleOpenQrDialog}>
                    <QrCode className="h-4 w-4 mr-1" />Sign with Phone
                  </Button>
                  <Button size="sm" onClick={() => setSignDialogOpen(true)}>
                    <Pen className="h-4 w-4 mr-1" />Sign Document
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px]">
            <PDFViewer
              url={resolvedUrl}
              placements={displayPlacements}
              signedOverlays={signedOverlays}
              onPlacementAdd={isEditing ? handleAddPlacement : undefined}
              onPlacementRemove={isEditing ? handleRemovePlacement : undefined}
              onPlacementResize={isEditing || allowPlacementAdjustments ? handleResizePlacement : undefined}
              onPlacementMove={isEditing || allowPlacementAdjustments ? handleMovePlacement : undefined}
              isEditing={isEditing}
              currentStepIndex={currentStepIndex}
              readOnly={!isEditing}
              allowExistingPlacementAdjustments={allowPlacementAdjustments}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sign Dialog */}
      {onSign && (
        <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sign Document</DialogTitle>
              <DialogDescription>Draw your signature below to approve this document.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <SignatureCanvas onSignatureChange={setSignatureDataUrl} width={400} height={150} />
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
              <Check className="h-4 w-4 text-success" />
              <span>By signing, you confirm you have reviewed and approve this document.</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSignDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSignDocument} disabled={!signatureDataUrl}>
                <Pen className="h-4 w-4 mr-1" />Apply Signature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign with Phone</DialogTitle>
            <DialogDescription>Scan this QR code with your phone camera, or use the buttons below.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            {qrUrl && (
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={qrUrl} size={200} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-1" />Copy Link
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={handleOpenNewTab}>
              <ExternalLink className="h-4 w-4 mr-1" />Open in New Tab
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Once you sign on the other tab/device, the signature will appear here automatically.
            <br />
            <span className="font-medium">For same-browser tabs</span>, signature syncs instantly.
            For a phone on the same WiFi, open the link in the phone browser.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
