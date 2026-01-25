import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get a signed URL for a payment proof image
 * Works for both authenticated staff and guests viewing their own proofs
 */
export function useSignedProofUrl(proofUrl: string | null, orderId?: string) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proofUrl) {
      setSignedUrl(null);
      return;
    }

    // Extract file path from the full URL
    const extractFilePath = (url: string): string | null => {
      try {
        // URL format: .../storage/v1/object/public/payment-proofs/filename
        const match = url.match(/payment-proofs\/(.+)$/);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    };

    const filePath = extractFilePath(proofUrl);
    if (!filePath) {
      setError('Invalid proof URL format');
      return;
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          'get-signed-proof-url',
          {
            body: { filePath, orderId },
          }
        );

        if (fnError) {
          throw fnError;
        }

        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        } else if (data?.error) {
          setError(data.error);
        }
      } catch (err) {
        console.error('Failed to get signed URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [proofUrl, orderId]);

  return { signedUrl, isLoading, error };
}
