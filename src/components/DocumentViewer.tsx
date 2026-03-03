import { useMemo, useState, useCallback } from 'react';
import { PDFViewer, SignaturePlacement } from './PDFViewer';
import { SignatureCanvas } from './SignatureCanvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ApprovalStep } from '@/types';
import { Check, Pen, FileText, Download, QrCode } from 'lucide-react';
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
}

function resolveDocumentUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('blob:')) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${window.location.origin}${path}`;
}

export function DocumentViewer({
  documentUrl,
  steps,
  currentUserStepId,
  onSign,
  isEditing = false,
  placements: externalPlacements,
  requestId,
}: DocumentViewerProps) {
  const [editPlacements, setEditPlacements] = useState<SignaturePlacement[]>([]);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const currentStep = steps.find((s) => s.id === currentUserStepId);
  const currentStepIndex = currentStep?.order_index;

  const resolvedUrl = useMemo(() => resolveDocumentUrl(documentUrl), [documentUrl]);

  const displayPlacements = externalPlacements || editPlacements;

  const signedOverlays = useMemo(() => {
    if (!externalPlacements) return [];
    return steps
      .filter((s) => s.status === 'APPROVED' && s.signature_path)
      .map((s) => {
        const placement = externalPlacements.find((p) => p.stepIndex === s.order_index);
        if (!placement) return null;
        return { placement, signatureDataUrl: s.signature_path!, approverName: s.approver_name };
      })
      .filter(Boolean) as { placement: SignaturePlacement; signatureDataUrl: string; approverName: string }[];
  }, [steps, externalPlacements]);

  const allApproved = steps.length > 0 && steps.every((s) => s.status === 'APPROVED');

  const handleAddPlacement = useCallback(
    (placement: Omit<SignaturePlacement, 'id'>) => {
      const newPlacement: SignaturePlacement = {
        ...placement,
        id: `placement-${Date.now()}`,
        label: currentStep ? `${currentStep.approver_name}` : 'Signature',
      };
      setEditPlacements((prev) => [...prev, newPlacement]);
      toast.success('Signature field added');
    },
    [currentStep]
  );

  const handleRemovePlacement = useCallback((id: string) => {
    setEditPlacements((prev) => prev.filter((p) => p.id !== id));
    toast.success('Signature field removed');
  }, []);

  const handleResizePlacement = useCallback((id: string, width: number, height: number) => {
    setEditPlacements((prev) => prev.map((p) => p.id === id ? { ...p, width, height } : p));
  }, []);

  const handleSignDocument = () => {
    if (!signatureDataUrl) {
      toast.error('Please draw your signature first');
      return;
    }
    onSign?.(signatureDataUrl, editPlacements);
    setSignDialogOpen(false);
    toast.success('Document signed successfully!');
  };

  const handleDownloadSigned = async () => {
    if (!resolvedUrl || !externalPlacements) return;
    setIsDownloading(true);
    try {
      const pdfBytes = await generateSignedPdf(resolvedUrl, externalPlacements, steps);
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

  const qrToken = useMemo(() => {
    if (!requestId || !currentStep) return null;
    return createQrToken(requestId, currentStep.id, currentStep.approver_name);
  }, [requestId, currentStep]);

  const qrUrl = qrToken ? `${window.location.origin}/sign-mobile/${qrToken}` : '';

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
              {allApproved && externalPlacements && externalPlacements.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleDownloadSigned} disabled={isDownloading}>
                  <Download className="h-4 w-4 mr-1" />
                  {isDownloading ? 'Generating...' : 'Download Signed PDF'}
                </Button>
              )}
              {canSign && onSign && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setQrDialogOpen(true)}>
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
              onPlacementResize={isEditing ? handleResizePlacement : undefined}
              isEditing={isEditing}
              currentStepIndex={currentStepIndex}
              readOnly={!isEditing}
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
            <DialogDescription>Scan this QR code with your phone camera to sign on your mobile device.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            {qrUrl && (
              <div className="p-4 bg-white rounded-lg">
                <QRCodeSVG value={qrUrl} size={200} />
              </div>
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            The signature will appear automatically once submitted from your phone.
            <br />
            <span className="font-medium">Note:</span> Both devices must access the same URL for auto-sync.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
