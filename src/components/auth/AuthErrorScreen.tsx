import { AlertTriangle, RefreshCw, LogIn, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthErrorScreenProps {
  message: string;
  onRetry: () => void;
  onGoToLogin: () => void;
  onHardRefresh: () => void;
}

export default function AuthErrorScreen({
  message,
  onRetry,
  onGoToLogin,
  onHardRefresh,
}: AuthErrorScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Authentication Error</CardTitle>
          <CardDescription className="text-base">
            {message || "Auth check failed. Retry or sign in again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={onRetry} className="w-full" variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button onClick={onGoToLogin} className="w-full" variant="outline">
            <LogIn className="h-4 w-4 mr-2" />
            Go to Login
          </Button>
          <Button onClick={onHardRefresh} className="w-full" variant="ghost">
            <RotateCcw className="h-4 w-4 mr-2" />
            Hard Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
