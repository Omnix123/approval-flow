import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MOCK_USERS, APPROVAL_CHAIN } from '@/data/mockData';
import { ArrowLeft, Upload, X, Users, FileText, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CreateRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);

  // Available approvers (exclude current user)
  const availableApprovers = MOCK_USERS.filter(
    (u) => u.id !== user?.id && (u.role === 'approver' || u.role === 'admin')
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleApprover = (approverId: string) => {
    setSelectedApprovers((prev) =>
      prev.includes(approverId)
        ? prev.filter((id) => id !== approverId)
        : [...prev, approverId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a request title');
      return;
    }

    if (selectedApprovers.length === 0) {
      toast.error('Please select at least one approver');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success('Request created successfully!');
    navigate('/requests');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Procurement Request</h1>
          <p className="text-muted-foreground">Create a new payment requisition form</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Request Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Office Stationery Supplies Q1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Vendor Name
              </Label>
              <Input
                id="vendor"
                placeholder="e.g., Office Solutions Ltd"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Documents
            </CardTitle>
            <CardDescription>
              Upload the payment requisition form and supporting documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, DOC, DOCX, XLS, XLSX (max 10MB)
                </p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approvers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Approval Chain
            </CardTitle>
            <CardDescription>
              Select the approvers in the order they should sign (following the hierarchy)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {APPROVAL_CHAIN.map((chainItem, index) => {
                const approver = availableApprovers.find(
                  (a) => a.department === chainItem.department
                );
                if (!approver) return null;

                const isSelected = selectedApprovers.includes(approver.id);
                const orderIndex = selectedApprovers.indexOf(approver.id);

                return (
                  <div
                    key={chainItem.order}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => toggleApprover(approver.id)}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleApprover(approver.id)}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{approver.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {chainItem.role} • {chainItem.department}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {orderIndex + 1}
                      </div>
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
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                      >
                        <span className="font-bold">{index + 1}.</span>
                        {approver?.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Request'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
