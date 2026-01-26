import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ForbiddenScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-4">
      <ShieldX className="h-16 w-16 text-destructive" />
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Access Forbidden</h1>
        <p className="text-muted-foreground">
          You don't have permission to access this page.
        </p>
      </div>
      <Button onClick={() => navigate('/admin/orders')}>
        Go to Orders Dashboard
      </Button>
    </div>
  );
}
