import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";

interface UserData {
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_super_admin: boolean;
  roles?: Array<{ id: string; role: string; tenant_role: string | null; tenant_id: string | null }>;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSave: (data: { userId: string; displayName: string; tenantRole?: "tenant_admin" | "staff" }) => Promise<void>;
  isSaving: boolean;
}

export default function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSave,
  isSaving,
}: EditUserDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [tenantRole, setTenantRole] = useState<"tenant_admin" | "staff">("staff");

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      const currentTenantRole = user.roles?.find(r => r.tenant_role)?.tenant_role;
      setTenantRole(currentTenantRole === "tenant_admin" ? "tenant_admin" : "staff");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const hasTenantRole = user.roles?.some(r => r.tenant_role);
    
    await onSave({
      userId: user.user_id,
      displayName,
      tenantRole: hasTenantRole ? tenantRole : undefined,
    });
  };

  if (!user) return null;

  const hasTenantRole = user.roles?.some(r => r.tenant_role);
  const isSuperAdminUser = user.is_super_admin;

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
              value={user.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          {hasTenantRole && !isSuperAdminUser && (
            <div className="space-y-2">
              <Label htmlFor="role">Tenant Role</Label>
              <Select 
                value={tenantRole} 
                onValueChange={(v) => setTenantRole(v as "tenant_admin" | "staff")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tenant Admin has full access within their venue.
              </p>
            </div>
          )}

          {isSuperAdminUser && (
            <div className="p-3 rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Super Admin role cannot be changed from this dialog.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
