import { AlertTriangle, RefreshCw, LogIn, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export interface AuthDiagnostics {
  sessionFound: boolean;
  profileFetch: 'ok' | 'failed' | 'pending' | 'skipped';
  timeoutHit: boolean;
  requestId: string;
  errorType?: string;
  timestamp: string;
}

interface AuthErrorScreenProps {
  message: string;
  onRetry: () => void;
  onGoToLogin: () => void;
  onHardRefresh: () => void;
  diagnostics?: AuthDiagnostics;
}

export default function AuthErrorScreen({
  message,
  onRetry,
  onGoToLogin,
  onHardRefresh,
  diagnostics,
}: AuthErrorScreenProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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

          {diagnostics && (
            <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full mt-4 text-muted-foreground">
                  {showDiagnostics ? (
                    <ChevronUp className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  )}
                  Auth Diagnostics
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">sessionFound:</span>
                    <span className={diagnostics.sessionFound ? 'text-status-success' : 'text-destructive'}>
                      {diagnostics.sessionFound ? 'true' : 'false'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">profileFetch:</span>
                    <span className={
                      diagnostics.profileFetch === 'ok' ? 'text-status-success' : 
                      diagnostics.profileFetch === 'failed' ? 'text-destructive' : 'text-status-warning'
                    }>
                      {diagnostics.profileFetch}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">timeoutHit:</span>
                    <span className={diagnostics.timeoutHit ? 'text-destructive' : 'text-status-success'}>
                      {diagnostics.timeoutHit ? 'yes' : 'no'}
                    </span>
                  </div>
                  {diagnostics.errorType && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">errorType:</span>
                      <span className="text-destructive">{diagnostics.errorType}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-muted-foreground">requestId:</span>
                    <span className="text-foreground">{diagnostics.requestId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">timestamp:</span>
                    <span className="text-foreground">{diagnostics.timestamp}</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
