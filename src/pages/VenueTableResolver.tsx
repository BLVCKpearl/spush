import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTableSession } from '@/hooks/useTableSession';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function VenueTableResolver() {
  const { venueSlug } = useParams<{ venueSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qrToken = searchParams.get('t');
  
  const { resolveTable, isLoading, error } = useTableSession();
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (hasAttempted) return;
    
    if (!venueSlug || !qrToken) {
      return;
    }

    setHasAttempted(true);
    
    resolveTable(venueSlug, qrToken).then((session) => {
      if (session) {
        // Redirect to the menu page for this venue
        navigate(`/menu/${session.venueSlug}`, { replace: true });
      }
    });
  }, [venueSlug, qrToken, resolveTable, navigate, hasAttempted]);

  // Missing parameters
  if (!venueSlug || !qrToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Invalid QR Code</h1>
            <p className="text-muted-foreground mb-4">
              This QR code appears to be invalid or incomplete. Please scan the QR code on your table again.
            </p>
            <p className="text-sm text-muted-foreground">
              If the problem persists, please ask a staff member for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Finding your table...</h1>
            <p className="text-muted-foreground">
              Please wait while we set up your ordering session.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Unable to Find Table</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mt-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default loading while effect runs
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Loading...</h1>
        </CardContent>
      </Card>
    </div>
  );
}
