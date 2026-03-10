import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useApproverProfiles, useCreateRequest } from '@/hooks/useSupabaseData';
import { ArrowLeft, Upload, X, Users, FileText, Building2, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type WizardStep = 'details' | 'approvers';

export default function CreateRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wizardStep, setWizardStep] = useState<WizardStep>('details');

  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);

  const { data: approverProfiles = [], isLoading: approversLoading } = useApproverProfiles();
  const createRequest = useCreateRequest();

  const availableApprovers = approverProfiles.filter((a) => a.id !== user?.id);

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

  const canGoToApprovers = title.trim().length > 0;

  const goNext = () => {
    if (wizardStep === 'details') {
      if (!title.trim()) { toast.error('Please enter a request title'); return; }
      setWizardStep('approvers');
    }
  };

  const goBack = () => {
    if (wizardStep === 'approvers') setWizardStep('details');
  };

  const handleSubmit = () => {
    if (selectedApprovers.length === 0) { toast.error('Please select at least one approver'); return; }

    createRequest.mutate(
      { title, vendorName, approverIds: selectedApprovers, files: uploadedFiles },
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Procurement Request</h1>
          <p className="text-muted-foreground">
            {wizardStep === 'details' && 'Step 1: Enter request details and upload documents'}
            {wizardStep === 'approvers' && 'Step 2: Select the approval chain'}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {(['details', 'approvers'] as WizardStep[]).map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
              wizardStep === step ? 'bg-primary text-primary-foreground' :
              (['details', 'approvers'].indexOf(wizardStep) > i)
                ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
            )}>{i + 1}</div>
            {i < 1 && <div className={cn('w-12 h-0.5', (['details', 'approvers'].indexOf(wizardStep) > i) ? 'bg-primary' : 'bg-border')} />}
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

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        {wizardStep !== 'details' && (
          <Button type="button" variant="outline" onClick={goBack}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="outline" onClick={() => navigate('/')}>Cancel</Button>
        {wizardStep === 'approvers' ? (
          <Button onClick={handleSubmit} disabled={createRequest.isPending || selectedApprovers.length === 0}>
            {createRequest.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Request'}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canGoToApprovers}>
            Next<ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
