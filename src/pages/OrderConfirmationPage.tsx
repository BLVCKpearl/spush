import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder, useUploadPaymentProof } from '@/hooks/useOrders';
import { useBankDetails } from '@/hooks/useBankDetails';
import { formatNaira } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Bell, 
  Loader2,
  Copy,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  pending: { label: 'Order Received', icon: Clock, color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-500' },
  preparing: { label: 'Preparing', icon: ChefHat, color: 'bg-orange-500' },
  ready: { label: 'Ready', icon: Bell, color: 'bg-green-500' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-gray-500' },
  cancelled: { label: 'Cancelled', icon: Clock, color: 'bg-red-500' },
};

export default function OrderConfirmationPage() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: order, isLoading } = useOrder(reference || '');
  const { data: bankDetails } = useBankDetails();
  const uploadProof = useUploadPaymentProof();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-4">
              We couldn't find an order with this reference.
            </p>
            <Button onClick={() => navigate('/order')}>
              Place New Order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadProof = async () => {
    if (!selectedFile) return;
    
    try {
      await uploadProof.mutateAsync({
        orderId: order.id,
        file: selectedFile,
      });
      setSelectedFile(null);
      toast.success('Payment proof uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload proof:', error);
      toast.error('Failed to upload payment proof');
    }
  };

  const hasUploadedProof = order.payment_proofs && order.payment_proofs.length > 0;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-6">
        <div className="text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3" />
          <h1 className="text-xl font-semibold">Order Placed!</h1>
          <p className="text-primary-foreground/80 mt-1">Table {order.table_number}</p>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-md mx-auto -mt-4">
        {/* Order Reference */}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Order Reference</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold tracking-wider">{order.order_reference}</p>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => copyToClipboard(order.order_reference, 'Reference')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${status.color} text-white`}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{status.label}</p>
                <p className="text-sm text-muted-foreground">
                  {order.payment_confirmed ? 'Payment confirmed' : 'Awaiting payment confirmation'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Transfer Details */}
        {order.payment_method === 'bank_transfer' && bankDetails && !order.payment_confirmed && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bank Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Bank Name</span>
                  <span className="font-medium">{bankDetails.bank_name}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Account Name</span>
                  <span className="font-medium">{bankDetails.account_name}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{bankDetails.account_number}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(bankDetails.account_number, 'Account number')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-bold text-lg">{formatNaira(order.total_kobo)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{order.order_reference}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(order.order_reference, 'Reference')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                Please include the order reference in your transfer narration
              </p>

              {/* Upload Payment Proof */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Upload Payment Proof (Optional)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {hasUploadedProof ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm">Payment proof uploaded</span>
                  </div>
                ) : selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={handleUploadProof}
                      disabled={uploadProof.isPending}
                    >
                      {uploadProof.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Proof
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select Image
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cash Payment Info */}
        {order.payment_method === 'cash' && !order.payment_confirmed && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Pay with Cash</p>
                  <p className="text-sm text-muted-foreground">
                    A waiter will come to collect payment at your table
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.menu_items.name} × {item.quantity}
                </span>
                <span>{formatNaira(item.unit_price_kobo * item.quantity)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatNaira(order.total_kobo)}</span>
            </div>
          </CardContent>
        </Card>

        {/* New Order Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate(`/order?table=${order.table_number}`)}
        >
          Place Another Order
        </Button>
      </main>
    </div>
  );
}
