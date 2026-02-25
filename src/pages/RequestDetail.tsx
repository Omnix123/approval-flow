import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { ApprovalProgress } from '@/components/ApprovalProgress';
import { DocumentViewer } from '@/components/DocumentViewer';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { getRequests, getSteps, getFiles } from '@/data/requestStore';
import { MOCK_COMMENTS } from '@/data/mockData';
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  User,
  Download,
  Pen,
  RotateCcw,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [returnMessage, setReturnMessage] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  // Find request
  const request = getRequests().find((r) => r.id === id);
  const steps = id ? (getSteps()[id] || []) : [];
  const files = id ? (getFiles()[id] || []) : [];
  const comments = id ? MOCK_COMMENTS[id] || [] : [];

  // Check if current user can approve
  const currentUserStep = useMemo(() => {
    if (!user) return null;
    return steps.find(
      (step) =>
        step.approver_id === user.id &&
        step.status === 'WAITING' &&
        (step.order_index === 0 || steps[step.order_index - 1]?.status === 'APPROVED')
    );
  }, [user, steps]);

  const canApprove = !!currentUserStep;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSign = () => {
    if (!signatureDataUrl) {
      toast.error('Please draw your signature first');
      return;
    }
    toast.success('Document signed successfully!');
    setSignDialogOpen(false);
    setSignatureDataUrl(null);
  };

  const handleReturn = () => {
    if (!returnMessage.trim()) {
      toast.error('Please provide a reason for returning the document');
      return;
    }
    toast.success('Document returned to requester');
    setReturnDialogOpen(false);
    setReturnMessage('');
  };

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Request not found</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/requests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Requests
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/requests">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{request.title}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-muted-foreground">Request #{request.short_id}</p>
        </div>
      </div>

      {/* Action Banner for Approvers */}
      {canApprove && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                <p className="font-medium">Your signature is required for this document</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setSignDialogOpen(true)}>
                  <Pen className="mr-2 h-4 w-4" />
                  Sign Document
                </Button>
                <Button variant="outline" onClick={() => setReturnDialogOpen(true)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Return
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="details" className="gap-2">
            <FileText className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="document" className="gap-2">
            <Eye className="h-4 w-4" />
            View Document
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Request Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Requester</p>
                        <p className="font-medium">{request.requester_name}</p>
                      </div>
                    </div>

                    {request.vendor_name && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Vendor</p>
                          <p className="font-medium">{request.vendor_name}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="font-medium">{formatDate(request.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Updated</p>
                        <p className="font-medium">{formatDate(request.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attached Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Attached Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  {files.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No documents attached</p>
                  ) : (
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="font-medium">{file.filename}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveTab('document')}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comments */}
              {comments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Comments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-destructive">{comment.from_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </p>
                        </div>
                        <p className="text-sm">{comment.message}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Approval Progress */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Approval Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <ApprovalProgress steps={steps} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Document Tab */}
        <TabsContent value="document" className="mt-6">
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <DocumentViewer
                documentUrl={files[0]?.path || ''}
                steps={steps}
                currentUserStepId={currentUserStep?.id}
                isEditing={canApprove}
                onSign={(signatureData, placements) => {
                  toast.success('Document signed with ' + placements.length + ' signature placements');
                }}
              />
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Approval Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <ApprovalProgress steps={steps} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sign Dialog with Signature Canvas */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              Draw your signature below to approve this procurement request.
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
            <CheckCircle className="h-4 w-4 text-success shrink-0" />
            <span>
              By signing, you confirm you have reviewed and approve all attached documents.
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={!signatureDataUrl}>
              <Pen className="mr-2 h-4 w-4" />
              Confirm Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return for Revision</DialogTitle>
            <DialogDescription>
              Please provide a reason why this request needs to be revised.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Describe what needs to be corrected..."
              value={returnMessage}
              onChange={(e) => setReturnMessage(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReturn}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Return Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
