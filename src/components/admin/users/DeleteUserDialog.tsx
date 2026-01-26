import { useState, useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDeleteUser, type ManagedUser } from '@/hooks/useUserManagement';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ManagedUser | null;
}

export default function DeleteUserDialog({
  open,
  onOpenChange,
  user,
}: DeleteUserDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const mountedRef = useRef(true);
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setConfirmText('');
      setIsDeleting(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!user || confirmText !== 'DELETE') return;

    setIsDeleting(true);

    try {
      await deleteUser.mutateAsync(user.user_id);

      if (mountedRef.current) {
        toast({
          title: 'User deleted',
          description: `${user.display_name || user.email} has been permanently deleted.`,
        });
        onOpenChange(false);
      }
    } catch (error) {
      if (mountedRef.current) {
        toast({
          title: 'Failed to delete user',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'destructive',
        });
        setIsDeleting(false);
      }
    }
  };

  const isConfirmValid = confirmText === 'DELETE';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete User Permanently
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You are about to permanently delete{' '}
              <span className="font-semibold text-foreground">
                {user?.display_name || user?.email}
              </span>
              .
            </p>
            <p>This action will:</p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Remove the user account</li>
              <li>Delete their profile data</li>
              <li>Invalidate all active sessions</li>
              <li>Revoke all access permissions</li>
            </ul>
            <p className="text-sm font-medium text-destructive">
              This action cannot be undone. Historical records (orders, payments, audit logs) will be preserved.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-delete" className="text-sm">
            Type <span className="font-mono font-semibold">DELETE</span> to confirm:
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="font-mono"
            disabled={isDeleting}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete User'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
