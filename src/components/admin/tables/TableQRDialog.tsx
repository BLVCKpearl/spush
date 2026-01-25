import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Download, Check, Printer } from 'lucide-react';
import { generateQRCodeDataURL, getTableQRUrl, downloadQRCode } from '@/lib/qrcode';
import { toast } from 'sonner';

interface TableQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: {
    id: string;
    label: string;
    qr_token: string;
    venues: {
      name: string;
      venue_slug: string;
    };
  } | null;
}

export function TableQRDialog({ open, onOpenChange, table }: TableQRDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const url = table ? getTableQRUrl(table.venues.venue_slug, table.qr_token) : '';

  useEffect(() => {
    if (table && open) {
      generateQRCodeDataURL(url, 300).then(setQrDataUrl);
    }
  }, [table, open, url]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!table) return;
    setDownloading(true);
    try {
      await downloadQRCode(table.venues.venue_slug, table.qr_token, table.label);
      toast.success('QR code downloaded');
    } catch (error) {
      toast.error('Failed to download QR code');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !table || !qrDataUrl) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${table.label}</title>
          <style>
            @page {
              size: A6;
              margin: 10mm;
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .container {
              text-align: center;
              max-width: 100%;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 8px 0;
              color: #111;
            }
            h2 {
              font-size: 16px;
              margin: 0 0 20px 0;
              color: #666;
              font-weight: normal;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .scan-text {
              margin-top: 16px;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${table.label}</h1>
            <h2>${table.venues.name}</h2>
            <img src="${qrDataUrl}" alt="QR Code" />
            <p class="scan-text">Scan to order</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (!table) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{table.label} - QR Code</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 bg-muted animate-pulse rounded" />
            )}
            <p className="mt-2 text-sm text-muted-foreground">{table.venues.name}</p>
          </div>

          <div className="flex gap-2">
            <Input value={url} readOnly className="text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </Button>
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print (A6)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
