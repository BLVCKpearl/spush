import { useNavigate } from 'react-router-dom';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { XCircle, UserCog, Pencil } from 'lucide-react';

export default function ImpersonationBanner() {
  const navigate = useNavigate();
  const { isImpersonating, impersonatedTenant, stopImpersonation, returnUrl } = useImpersonation();

  if (!isImpersonating || !impersonatedTenant) {
    return null;
  }

  const handleStopImpersonation = async () => {
    await stopImpersonation();
    // Navigate back to return URL or default to impersonation page
    const targetUrl = returnUrl || '/super-admin/impersonation';
    navigate(targetUrl, { replace: true });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <UserCog className="h-4 w-4" />
        <span className="text-sm font-medium">
          Impersonating: <strong>{impersonatedTenant.name}</strong>
        </span>
        <span className="text-sm opacity-75">({impersonatedTenant.venue_slug})</span>
        <span className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-destructive-foreground/10 text-xs font-medium">
          <Pencil className="h-3 w-3" />
          Read/Write Mode
        </span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleStopImpersonation}
        className="text-destructive-foreground hover:bg-destructive-foreground/10"
      >
        <XCircle className="h-4 w-4 mr-1" />
        Exit Impersonation
      </Button>
    </div>
  );
}
