import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateUser, type ManagedUser } from '@/hooks/useUserManagement';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil } from 'lucide-react';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ManagedUser | null;
  activeAdminCount?: number;
}

export default function EditUserDialog({
  open,
  onOpenChange,
  user,
  activeAdminCount = 0,
}: EditUserDialogProps) {
  const [fullName, setFullName] = useState('');
  const [tenantRole, setTenantRole] = useState<'tenant_admin' | 'staff'>('staff');
  const [isActive, setIsActive] = useState(true);

  const updateUser = useUpdateUser();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFullName(user.display_name || '');
      setTenantRole(user.tenant_role || 'staff');
      setIsActive(user.is_active);
    }
  }, [user]);

  // Check if this is the last active tenant admin
  const isLastTenantAdmin = 
    user?.tenant_role === 'tenant_admin' && 
    user?.is_active && 
    activeAdminCount <= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Prevent demoting or deactivating last tenant admin
    if (isLastTenantAdmin && (tenantRole === 'staff' || !isActive)) {
      toast({
        title: 'Cannot modify last admin',
        description: 'There must be at least one active tenant admin.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateUser.mutateAsync({
        userId: user.user_id,
        fullName,
        role: tenantRole === 'tenant_admin' ? 'admin' : 'staff',
        tenantRole,
        isActive,
      });
      toast({
        title: 'User updated',
        description: 'User information has been updated successfully.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Failed to update user',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user information and permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={user.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantRole">Role</Label>
            <Select 
              value={tenantRole} 
              onValueChange={(v) => setTenantRole(v as 'tenant_admin' | 'staff')}
              disabled={isLastTenantAdmin}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="tenant_admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {isLastTenantAdmin && (
              <p className="text-xs text-destructive">
                Cannot change role - this is the last active admin.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Admins can manage users, menu, and settings. Staff can only manage orders.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Inactive users cannot log in.
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isLastTenantAdmin}
            />
          </div>
          {isLastTenantAdmin && !isActive && (
            <p className="text-xs text-destructive">
              Cannot deactivate - this is the last active admin.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
