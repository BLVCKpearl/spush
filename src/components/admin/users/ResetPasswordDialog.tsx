import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useResetPassword, type ManagedUser } from '@/hooks/useUserManagement';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, Copy, Check, AlertCircle } from 'lucide-react';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ManagedUser | null;
}

export default function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
}: ResetPasswordDialogProps) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetPassword = useResetPassword();
  const { toast } = useToast();

  const handleReset = async () => {
    if (!user) return;

    try {
      const result = await resetPassword.mutateAsync(user.user_id);
      setTempPassword(result.temporaryPassword);
      toast({
        title: 'Password reset',
        description: 'A new temporary password has been generated.',
      });
    } catch (error) {
      toast({
        title: 'Failed to reset password',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleCopyPassword = async () => {
    if (tempPassword) {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setTempPassword(null);
    setCopied(false);
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Reset Password
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tempPassword ? (
              'Password has been reset. The user will be required to set a new password on their next login.'
            ) : (
              <>
                Are you sure you want to reset the password for{' '}
                <span className="font-medium">{user.display_name || user.email}</span>?
                <br />
                <span className="text-muted-foreground">
                  They will receive a temporary password and must change it on next login.
                </span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {tempPassword ? (
          <div className="space-y-4">
            <Alert className="border-primary/20 bg-primary/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm text-muted-foreground mb-3">
                  Share this temporary password securely with the user. They will be
                  required to set a new password after logging in.
                </p>
                <div className="flex items-center gap-2 bg-background p-2 rounded border">
                  <code className="flex-1 text-sm font-mono break-all">
                    {tempPassword}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>

            <AlertDialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </AlertDialogFooter>
          </div>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="default"
              onClick={handleReset}
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
