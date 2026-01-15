import { useState, useCallback } from 'react';
import { PDFViewer, SignaturePlacement } from './PDFViewer';
import { SignatureCanvas } from './SignatureCanvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
}

// Demo PDF URL - in production this would be your actual document
const DEMO_PDF_URL = 'https://raw.githubusercontent.com/nicobao/pdf-sample/main/simple-pdf.pdf';

export function DocumentViewer({
  documentUrl,
  steps,
  currentUserStepId,
  onSign,
  isEditing = false,
}: DocumentViewerProps) {
  const [placements, setPlacements] = useState<SignaturePlacement[]>([]);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<SignaturePlacement | null>(null);

  const currentStep = steps.find((s) => s.id === currentUserStepId);
  const currentStepIndex = currentStep?.order_index;

  const handleAddPlacement = useCallback(
    (placement: Omit<SignaturePlacement, 'id'>) => {
      const newPlacement: SignaturePlacement = {
        ...placement,
        id: `placement-${Date.now()}`,
        label: currentStep ? `${currentStep.approver_name}` : 'Signature',
      };
      setPlacements((prev) => [...prev, newPlacement]);
      toast.success('Signature field added');
    },
    [currentStep]
  );

  const handleRemovePlacement = useCallback((id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
    toast.success('Signature field removed');
  }, []);

  const handleSignDocument = () => {
    if (!signatureDataUrl) {
      toast.error('Please draw your signature first');
      return;
    }

    onSign?.(signatureDataUrl, placements);
    setSignDialogOpen(false);
    toast.success('Document signed successfully!');
  };

  const canSign = currentUserStepId && currentStep?.status === 'WAITING';

  return (
    <div className="space-y-4">
      {/* PDF Viewer */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document Preview
            </CardTitle>
            {canSign && (
              <Button size="sm" onClick={() => setSignDialogOpen(true)}>
                <Pen className="h-4 w-4 mr-1" />
                Sign Document
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px]">
            <PDFViewer
              url={DEMO_PDF_URL}
              placements={placements}
              onPlacementAdd={isEditing ? handleAddPlacement : undefined}
              onPlacementRemove={isEditing ? handleRemovePlacement : undefined}
              isEditing={isEditing}
              currentStepIndex={currentStepIndex}
              readOnly={!isEditing}
            />
          </div>
        </CardContent>
      </Card>

      {/* Placement Summary */}
      {placements.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              Signature Fields ({placements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {placements.map((p, index) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg text-sm"
                >
                  <span>
                    {p.label || `Field ${index + 1}`} - Page {p.pageNumber}
                  </span>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePlacement(p.id)}
                      className="h-6 text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              Draw your signature below to approve this document.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <SignatureCanvas
              onSignatureChange={setSignatureDataUrl}
              width={400}
              height={150}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
            <Check className="h-4 w-4 text-success" />
            <span>
              By signing, you confirm you have reviewed and approve this document.
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSignDocument} disabled={!signatureDataUrl}>
              <Pen className="h-4 w-4 mr-1" />
              Apply Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
