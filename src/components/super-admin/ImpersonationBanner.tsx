import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { XCircle, UserCog } from 'lucide-react';

export default function ImpersonationBanner() {
  const { isImpersonating, impersonatedTenant, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedTenant) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <UserCog className="h-4 w-4" />
        <span className="text-sm font-medium">
          Viewing as: <strong>{impersonatedTenant.name}</strong>
        </span>
        <span className="text-sm opacity-75">({impersonatedTenant.venue_slug})</span>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={stopImpersonation}
        className="text-destructive-foreground hover:bg-destructive-foreground/10"
      >
        <XCircle className="h-4 w-4 mr-1" />
        Exit
      </Button>
    </div>
  );
}
