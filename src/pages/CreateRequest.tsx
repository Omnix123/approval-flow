/**
 * CreateRequest.tsx — New Procurement Request Wizard (Route: /create)
 * 
 * WIZARD STEPS:
 * 1. DETAILS — Enter request title, vendor name, document type, and upload supporting documents
 * 2. APPROVERS — Select which approvers should sign, and in what order
 * 3. SIGNATURES — Place signature fields on the uploaded PDF for each approver
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApproverProfiles, useCreateRequest } from '@/hooks/useSupabaseData';
import { PDFViewer, SignaturePlacement } from '@/components/PDFViewer';
import { ArrowLeft, Upload, X, Users, FileText, Building2, Loader2, ChevronRight, ChevronLeft, Pen } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type WizardStep = 'details' | 'approvers' | 'signatures';
type DocumentType = 'payment_requisition' | 'memo';

const WIZARD_STEPS: WizardStep[] = ['details', 'approvers', 'signatures'];
const STEP_LABELS = ['Request Details', 'Approval Chain', 'Signature Placement'];

export default function CreateRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wizardStep, setWizardStep] = useState<WizardStep>('details');

  // Form state for step 1 (details)
  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('payment_requisition');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Form state for step 2 (approvers)
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);

  // Form state for step 3 (signature placements)
  const [signaturePlacements, setSignaturePlacements] = useState<SignaturePlacement[]>([]);
  const [activeApproverIndex, setActiveApproverIndex] = useState<number>(0);

  const { data: approverProfiles = [], isLoading: approversLoading } = useApproverProfiles();
  const createRequest = useCreateRequest();

  const availableApprovers = approverProfiles.filter((a) => a.id !== user?.id);

  // Create a blob URL for the first uploaded PDF for signature placement
  const pdfFile = uploadedFiles.find(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
  const pdfBlobUrl = useMemo(() => {
    if (!pdfFile) return '';
    return URL.createObjectURL(pdfFile);
  }, [pdfFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleApprover = (approverId: string) => {
    setSelectedApprovers((prev) =>
      prev.includes(approverId) ? prev.filter((id) => id !== approverId) : [...prev, approverId]
    );
  };

  // Callbacks for signature placement management
  const handlePlacementAdd = useCallback((placement: Omit<SignaturePlacement, 'id'>) => {
    const approver = availableApprovers.find(a => a.id === selectedApprovers[activeApproverIndex]);
    const newPlacement: SignaturePlacement = {
      ...placement,
      id: `placement-${Date.now()}`,
      stepIndex: activeApproverIndex,
      label: approver ? approver.name : `Approver ${activeApproverIndex + 1}`,
    };
    setSignaturePlacements((prev) => [...prev, newPlacement]);
    toast.success(`Signature field placed for ${newPlacement.label}`);
  }, [activeApproverIndex, selectedApprovers, availableApprovers]);

  const handlePlacementRemove = useCallback((id: string) => {
    setSignaturePlacements((prev) => prev.filter((p) => p.id !== id));
    toast.success('Signature field removed');
  }, []);

  const handlePlacementResize = useCallback((id: string, width: number, height: number) => {
    setSignaturePlacements((prev) => prev.map((p) => p.id === id ? { ...p, width, height } : p));
  }, []);

  const handlePlacementMove = useCallback((id: string, x: number, y: number) => {
    setSignaturePlacements((prev) => prev.map((p) => p.id === id ? { ...p, x, y } : p));
  }, []);

  const canGoToApprovers = title.trim().length > 0;
  const canGoToSignatures = selectedApprovers.length > 0;
  const currentStepIndex = WIZARD_STEPS.indexOf(wizardStep);

  const goNext = () => {
    if (wizardStep === 'details') {
      if (!title.trim()) { toast.error('Please enter a request title'); return; }
      setWizardStep('approvers');
    } else if (wizardStep === 'approvers') {
      if (selectedApprovers.length === 0) { toast.error('Please select at least one approver'); return; }
      if (!pdfFile) { toast.error('Please upload a PDF document first to place signatures'); return; }
      setWizardStep('signatures');
    }
  };

  const goBack = () => {
    if (wizardStep === 'approvers') setWizardStep('details');
    else if (wizardStep === 'signatures') setWizardStep('approvers');
  };

  const handleSubmit = () => {
    if (selectedApprovers.length === 0) { toast.error('Please select at least one approver'); return; }

    createRequest.mutate(
      { title, vendorName, approverIds: selectedApprovers, files: uploadedFiles, documentType },
      {
        onSuccess: () => {
          toast.success('Request created successfully!');
          navigate('/requests');
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Request</h1>
          <p className="text-muted-foreground">
            Step {currentStepIndex + 1}: {STEP_LABELS[currentStepIndex]}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {WIZARD_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
              wizardStep === step ? 'bg-primary text-primary-foreground' :
              currentStepIndex > i ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
            )}>{i + 1}</div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={cn('w-12 h-0.5', currentStepIndex > i ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* ==================== STEP 1: Request Details ==================== */}
      {wizardStep === 'details' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" />Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-type">Document Type *</Label>
                <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment_requisition">Payment Requisition (PRS/2)</SelectItem>
                    <SelectItem value="memo">Memorandum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">
                  {documentType === 'memo' ? 'Subject *' : 'Request Title *'}
                </Label>
                <Input
                  id="title"
                  placeholder={documentType === 'memo' ? 'e.g., Request for Payment of Monthly Internet Data Bundles' : 'e.g., Office Stationery Supplies Q1'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              {documentType === 'payment_requisition' && (
                <div className="space-y-2">
                  <Label htmlFor="vendor" className="flex items-center gap-2"><Building2 className="h-4 w-4" />Vendor Name</Label>
                  <Input id="vendor" placeholder="e.g., Office Solutions Ltd" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5" />Documents</CardTitle>
              <CardDescription>Upload PDF documents (required for signature placement)</CardDescription>
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

      {/* ==================== STEP 2: Approver Selection ==================== */}
      {wizardStep === 'approvers' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Approval Chain</CardTitle>
            <CardDescription>Select the approvers in the order they should sign</CardDescription>
          </CardHeader>
          <CardContent>
            {approversLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : availableApprovers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No approvers available. Ask an admin to assign approver roles.</p>
            ) : (
              <div className="space-y-3">
                {availableApprovers.map((approver) => {
                  const isSelected = selectedApprovers.includes(approver.id);
                  const orderIndex = selectedApprovers.indexOf(approver.id);
                  return (
                    <div key={approver.id} className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    )} onClick={() => toggleApprover(approver.id)}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleApprover(approver.id)} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{approver.name}</p>
                        <p className="text-sm text-muted-foreground">{approver.department || 'No department'} • {approver.role}</p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">{orderIndex + 1}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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

      {/* ==================== STEP 3: Signature Placement ==================== */}
      {wizardStep === 'signatures' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Pen className="h-5 w-5" />Place Signature Fields</CardTitle>
              <CardDescription>
                Select an approver below, then click "Add Signature" on the document toolbar and click on the PDF to place their signature field.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Approver selector */}
              <div className="space-y-2">
                <Label>Placing signature for:</Label>
                <Select
                  value={String(activeApproverIndex)}
                  onValueChange={(v) => setActiveApproverIndex(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedApprovers.map((id, i) => {
                      const approver = availableApprovers.find(a => a.id === id);
                      const hasPlacement = signaturePlacements.some(p => p.stepIndex === i);
                      return (
                        <SelectItem key={id} value={String(i)}>
                          {i + 1}. {approver?.name || 'Unknown'} {hasPlacement ? '✓' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Status chips */}
              <div className="flex flex-wrap gap-2">
                {selectedApprovers.map((id, i) => {
                  const approver = availableApprovers.find(a => a.id === id);
                  const hasPlacement = signaturePlacements.some(p => p.stepIndex === i);
                  return (
                    <span
                      key={id}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer',
                        activeApproverIndex === i ? 'ring-2 ring-primary' : '',
                        hasPlacement ? 'bg-primary/20 text-primary' : 'bg-destructive/10 text-destructive'
                      )}
                      onClick={() => setActiveApproverIndex(i)}
                    >
                      {i + 1}. {approver?.name} {hasPlacement ? '✓' : '✗'}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {pdfBlobUrl && (
            <div className="border rounded-lg overflow-hidden">
              <div className="h-[600px]">
                <PDFViewer
                  url={pdfBlobUrl}
                  placements={signaturePlacements}
                  onPlacementAdd={handlePlacementAdd}
                  onPlacementRemove={handlePlacementRemove}
                  onPlacementResize={handlePlacementResize}
                  onPlacementMove={handlePlacementMove}
                  isEditing={true}
                  currentStepIndex={activeApproverIndex}
                  readOnly={false}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-4">
        {wizardStep !== 'details' && (
          <Button type="button" variant="outline" onClick={goBack}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="outline" onClick={() => navigate('/')}>Cancel</Button>
        {wizardStep === 'signatures' ? (
          <Button onClick={handleSubmit} disabled={createRequest.isPending}>
            {createRequest.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Request'}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={
            (wizardStep === 'details' && !canGoToApprovers) ||
            (wizardStep === 'approvers' && !canGoToSignatures)
          }>
            Next<ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
