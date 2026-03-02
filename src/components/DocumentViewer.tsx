import { useMemo, useState, useCallback } from 'react';
import { PDFViewer, SignaturePlacement } from './PDFViewer';
import { SignatureCanvas } from './SignatureCanvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ApprovalStep } from '@/types';
import { Check, Pen, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentViewerProps {
  documentUrl: string;
  steps: ApprovalStep[];
  currentUserStepId?: string;
  onSign?: (signatureDataUrl: string, placements: SignaturePlacement[]) => void;
  isEditing?: boolean;
  placements?: SignaturePlacement[];
}

function resolveDocumentUrl(url: string) {
  if (!url) return '';
  // Blob URLs — use as-is
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
}: DocumentViewerProps) {
  const [editPlacements, setEditPlacements] = useState<SignaturePlacement[]>([]);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const currentStep = steps.find((s) => s.id === currentUserStepId);
  const currentStepIndex = currentStep?.order_index;

  const resolvedUrl = useMemo(() => resolveDocumentUrl(documentUrl), [documentUrl]);

  // Use external placements for viewing, internal for editing
  const displayPlacements = externalPlacements || editPlacements;

  // Build signed overlay data from steps that have signatures
  const signedOverlays = useMemo(() => {
    if (!externalPlacements) return [];
    return steps
      .filter((s) => s.status === 'APPROVED' && s.signature_path)
      .map((s) => {
        // Find the placement for this step
        const placement = externalPlacements.find((p) => p.stepIndex === s.order_index);
        if (!placement) return null;
        return {
          placement,
          signatureDataUrl: s.signature_path!,
          approverName: s.approver_name,
        };
      })
      .filter(Boolean) as { placement: SignaturePlacement; signatureDataUrl: string; approverName: string }[];
  }, [steps, externalPlacements]);

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

  const handleSignDocument = () => {
    if (!signatureDataUrl) {
      toast.error('Please draw your signature first');
      return;
    }
    onSign?.(signatureDataUrl, editPlacements);
    setSignDialogOpen(false);
    toast.success('Document signed successfully!');
  };

  const canSign = currentUserStepId && currentStep?.status === 'WAITING';

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />Document Preview
            </CardTitle>
            {canSign && onSign && (
              <Button size="sm" onClick={() => setSignDialogOpen(true)}>
                <Pen className="h-4 w-4 mr-1" />Sign Document
              </Button>
            )}
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
    </div>
  );
}
