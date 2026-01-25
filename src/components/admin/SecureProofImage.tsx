import { useState, useEffect } from 'react';
import { useSignedProofUrl } from '@/hooks/useSignedProofUrl';
import { ImageIcon, Loader2, AlertCircle } from 'lucide-react';

interface SecureProofImageProps {
  proofUrl: string | null;
  orderId?: string;
  alt?: string;
  className?: string;
}

/**
 * Component to securely display payment proof images using signed URLs
 */
export default function SecureProofImage({
  proofUrl,
  orderId,
  alt = 'Payment proof',
  className = 'w-full rounded-lg border max-h-64 object-contain bg-background',
}: SecureProofImageProps) {
  const { signedUrl, isLoading, error } = useSignedProofUrl(proofUrl, orderId);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [signedUrl]);

  if (!proofUrl) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg border">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || imageError) {
    return (
      <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Unable to load payment proof</span>
      </div>
    );
  }

  if (!signedUrl) {
    return null;
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
    />
  );
}
