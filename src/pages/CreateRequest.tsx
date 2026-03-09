import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MOCK_USERS, APPROVAL_CHAIN } from '@/data/mockData';
import { addRequest } from '@/data/requestStore';
import { SignaturePlacement } from '@/components/PDFViewer';
import { ResizablePlacement } from '@/components/ResizablePlacement';
import { ArrowLeft, Upload, X, Users, FileText, Building2, Loader2, Pen, ChevronRight, ChevronLeft, MousePointer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, ChevronLeft as CLeft, ChevronRight as CRight, Loader2 as Spin } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import mammoth from 'mammoth';

type WizardStep = 'details' | 'approvers' | 'signatures';

export default function CreateRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('details');

  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [placements, setPlacements] = useState<SignaturePlacement[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const availableApprovers = MOCK_USERS.filter(
    (u) => u.id !== user?.id && (u.role === 'approver' || u.role === 'admin')
  );

  const convertDocxToPdfBlob = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    // Create an HTML page and convert to blob URL for display
    const html = `<!DOCTYPE html><html><head><style>
      body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
      table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ddd; padding: 8px; }
      img { max-width: 100%; }
    </style></head><body>${result.value}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Set preview for first viewable file
    if (!previewUrl) {
      const firstPdf = newFiles.find((f) => f.type === 'application/pdf');
      if (firstPdf) {
        setPreviewUrl(URL.createObjectURL(firstPdf));
      } else {
        const firstDocx = newFiles.find((f) =>
          f.name.endsWith('.docx') || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        if (firstDocx) {
          try {
            const url = await convertDocxToPdfBlob(firstDocx);
            setPreviewUrl(url);
          } catch {
            toast.error('Could not preview Word document');
          }
        }
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) setPreviewUrl(null);
      return updated;
    });
  };

  const toggleApprover = (approverId: string) => {
    setSelectedApprovers((prev) =>
      prev.includes(approverId) ? prev.filter((id) => id !== approverId) : [...prev, approverId]
    );
  };

  const handleAddPlacement = (placement: Omit<SignaturePlacement, 'id'>) => {
    const newPlacement: SignaturePlacement = {
      ...placement,
      id: `placement-${Date.now()}`,
      label: placement.label || 'Signature',
    };
    setPlacements((prev) => [...prev, newPlacement]);
    toast.success('Signature position added');
  };

  const handleRemovePlacement = (id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
    toast.success('Signature position removed');
  };

  const handleResizePlacement = (id: string, width: number, height: number) => {
    setPlacements((prev) => prev.map((p) => p.id === id ? { ...p, width, height } : p));
  };

  const hasViewableFile = uploadedFiles.some(
    (f) => f.type === 'application/pdf' || f.name.endsWith('.docx') ||
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  const canGoToApprovers = title.trim().length > 0;

  const goNext = async () => {
    if (wizardStep === 'details') {
      if (!title.trim()) { toast.error('Please enter a request title'); return; }
      setWizardStep('approvers');
    } else if (wizardStep === 'approvers') {
      if (selectedApprovers.length === 0) { toast.error('Please select at least one approver'); return; }
      if (!hasViewableFile) {
        handleSubmit();
        return;
      }
      if (!previewUrl) {
        const firstPdf = uploadedFiles.find((f) => f.type === 'application/pdf');
        if (firstPdf) {
          setPreviewUrl(URL.createObjectURL(firstPdf));
        } else {
          const firstDocx = uploadedFiles.find((f) => f.name.endsWith('.docx'));
          if (firstDocx) {
            try {
              const url = await convertDocxToPdfBlob(firstDocx);
              setPreviewUrl(url);
            } catch { /* skip */ }
          }
        }
      }
      setWizardStep('signatures');
    }
  };

  const goBack = () => {
    if (wizardStep === 'approvers') setWizardStep('details');
    else if (wizardStep === 'signatures') setWizardStep('approvers');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const approverNames: Record<string, string> = {};
    availableApprovers.forEach((a) => { approverNames[a.id] = a.name; });

    addRequest(
      { title, vendorName, requesterId: user?.id || '', requesterName: user?.name || '' },
      selectedApprovers,
      approverNames,
      uploadedFiles,
      placements
    );

    toast.success('Request created successfully!');
    navigate('/requests');
  };

  const mockSteps = selectedApprovers.map((approverId, index) => {
    const approver = availableApprovers.find((a) => a.id === approverId);
    return {
      id: `temp-step-${index}`,
      request_id: 'new',
      order_index: index,
      approver_id: approverId,
      approver_name: approver?.name || 'Unknown',
      status: 'WAITING' as const,
    };
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Procurement Request</h1>
          <p className="text-muted-foreground">
            {wizardStep === 'details' && 'Step 1: Enter request details and upload documents'}
            {wizardStep === 'approvers' && 'Step 2: Select the approval chain'}
            {wizardStep === 'signatures' && 'Step 3: Place signature positions on the document'}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {(['details', 'approvers', 'signatures'] as WizardStep[]).map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
              wizardStep === step ? 'bg-primary text-primary-foreground' :
              (['details', 'approvers', 'signatures'].indexOf(wizardStep) > i)
                ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
            )}>{i + 1}</div>
            {i < 2 && <div className={cn('w-12 h-0.5', (['details', 'approvers', 'signatures'].indexOf(wizardStep) > i) ? 'bg-primary' : 'bg-border')} />}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {wizardStep === 'details' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" />Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Request Title *</Label>
                <Input id="title" placeholder="e.g., Office Stationery Supplies Q1" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor" className="flex items-center gap-2"><Building2 className="h-4 w-4" />Vendor Name</Label>
                <Input id="vendor" placeholder="e.g., Office Solutions Ltd" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5" />Documents</CardTitle>
              <CardDescription>Upload PDF or Word documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input type="file" id="file-upload" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileChange} className="hidden" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground mt-1">PDF, DOC, DOCX, XLS, XLSX (max 10MB)</p>
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Approvers */}
      {wizardStep === 'approvers' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Approval Chain</CardTitle>
            <CardDescription>Select the approvers in the order they should sign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {APPROVAL_CHAIN.map((chainItem) => {
                const approver = availableApprovers.find((a) => a.department === chainItem.department);
                if (!approver) return null;
                const isSelected = selectedApprovers.includes(approver.id);
                const orderIndex = selectedApprovers.indexOf(approver.id);
                return (
                  <div key={chainItem.order} className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  )} onClick={() => toggleApprover(approver.id)}>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleApprover(approver.id)} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{approver.name}</p>
                      <p className="text-sm text-muted-foreground">{chainItem.role} • {chainItem.department}</p>
                    </div>
                    {isSelected && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">{orderIndex + 1}</div>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedApprovers.length > 0 && (
              <div className="mt-4 p-3 bg-secondary rounded-lg">
                <p className="text-sm font-medium mb-2">Approval Order:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedApprovers.map((id, index) => {
                    const approver = availableApprovers.find((a) => a.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                        <span className="font-bold">{index + 1}.</span>{approver?.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Signature Placement */}
      {wizardStep === 'signatures' && previewUrl && (
        <div className="space-y-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <Pen className="h-5 w-5 text-primary" />
                <p className="font-medium">Click "Add Signature" in the toolbar, then click on the document to place each approver's signature. Drag the corner to resize.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[600px]">
                <SignaturePlacementViewer
                  url={previewUrl}
                  placements={placements}
                  onPlacementAdd={handleAddPlacement}
                  onPlacementRemove={handleRemovePlacement}
                  onPlacementResize={handleResizePlacement}
                  approvers={selectedApprovers.map((id, i) => {
                    const a = availableApprovers.find((u) => u.id === id);
                    return { id, name: a?.name || 'Unknown', index: i };
                  })}
                />
              </div>
            </CardContent>
          </Card>

          {placements.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">Placed Signatures ({placements.length})</CardTitle></CardHeader>
              <CardContent className="py-2">
                <div className="space-y-2">
                  {placements.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg text-sm">
                      <span>{p.label || `Field ${i + 1}`} — Page {p.pageNumber} ({Math.round(p.width)}% × {Math.round(p.height)}%)</span>
                      <Button variant="ghost" size="sm" onClick={() => handleRemovePlacement(p.id)} className="h-6 text-destructive hover:text-destructive">Remove</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        {wizardStep !== 'details' && (
          <Button type="button" variant="outline" onClick={goBack}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="outline" onClick={() => navigate('/')}>Cancel</Button>
        {wizardStep === 'signatures' ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Request'}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={wizardStep === 'details' ? !canGoToApprovers : !selectedApprovers.length}>
            Next<ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Inline component for signature placement on the PDF during creation
interface PlacementViewerProps {
  url: string;
  placements: SignaturePlacement[];
  onPlacementAdd: (p: Omit<SignaturePlacement, 'id'>) => void;
  onPlacementRemove: (id: string) => void;
  onPlacementResize: (id: string, width: number, height: number) => void;
  onPlacementMove: (id: string, x: number, y: number) => void;
  approvers: { id: string; name: string; index: number }[];
}

function SignaturePlacementViewer({ url, placements, onPlacementAdd, onPlacementRemove, onPlacementResize, approvers }: PlacementViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [placementMode, setPlacementMode] = useState(false);
  const [selectedApproverIdx, setSelectedApproverIdx] = useState(0);
  const pageRef = useRef<HTMLDivElement>(null);

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!placementMode || !pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const width = 20;
      const height = 8;
      const approver = approvers[selectedApproverIdx];
      onPlacementAdd({
        pageNumber,
        x: Math.max(0, Math.min(x - width / 2, 100 - width)),
        y: Math.max(0, Math.min(y - height / 2, 100 - height)),
        width,
        height,
        stepIndex: selectedApproverIdx,
        label: approver?.name || 'Signature',
      });
      setPlacementMode(false);
    },
    [placementMode, pageNumber, onPlacementAdd, selectedApproverIdx, approvers]
  );

  const currentPagePlacements = placements.filter((p) => p.pageNumber === pageNumber);

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-card border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1}><CLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground min-w-[80px] text-center">Page {pageNumber} of {numPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}><CRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} disabled={scale <= 0.5}><ZoomOut className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.min(2, s + 0.25))} disabled={scale >= 2}><ZoomIn className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm border border-border rounded px-2 py-1 bg-card text-foreground"
            value={selectedApproverIdx}
            onChange={(e) => setSelectedApproverIdx(Number(e.target.value))}
          >
            {approvers.map((a) => (
              <option key={a.id} value={a.index}>{a.name}</option>
            ))}
          </select>
          <Button variant={placementMode ? 'default' : 'outline'} size="sm" onClick={() => setPlacementMode(!placementMode)}>
            {placementMode ? <><MousePointer className="h-4 w-4 mr-1" />Click to place</> : <><Pen className="h-4 w-4 mr-1" />Add Signature</>}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <div
            ref={pageRef}
            className={cn('relative inline-block shadow-lg bg-white', placementMode && 'cursor-crosshair')}
            onClick={handlePageClick}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted z-10"><Spin className="h-8 w-8 animate-spin text-primary" /></div>
            )}
            <Document
              file={url}
              onLoadSuccess={({ numPages: n }) => { setNumPages(n); setIsLoading(false); }}
              onLoadError={() => setIsLoading(false)}
              loading={null} error={null} noData={null}
            >
              <Page pageNumber={pageNumber} scale={scale} renderTextLayer={true} renderAnnotationLayer={true} />
            </Document>

            {currentPagePlacements.map((p) => (
              <ResizablePlacement
                key={p.id}
                placement={p}
                isEditing={true}
                isCurrentStep={true}
                isSigned={false}
                onRemove={onPlacementRemove}
                onResize={onPlacementResize}
                containerRef={pageRef as React.RefObject<HTMLDivElement>}
              />
            ))}
          </div>
        </div>
      </div>

      {placementMode && (
        <div className="p-3 bg-primary/10 border-t border-primary/20 text-center">
          <p className="text-sm text-primary font-medium">
            Click on the document to place signature for: <strong>{approvers[selectedApproverIdx]?.name}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
