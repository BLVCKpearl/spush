import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Pencil, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type UserRoleType = "super_admin" | "tenant_admin" | "staff";

interface UserData {
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_super_admin: boolean;
  venue_id: string | null;
  roles?: Array<{ id: string; role: string; tenant_role: string | null; tenant_id: string | null }>;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSave: (data: { 
    userId: string; 
    displayName: string; 
    roleType: UserRoleType;
    tenantId: string | null;
  }) => Promise<void>;
  isSaving: boolean;
  validationError?: string | null;
}

export default function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSave,
  isSaving,
  validationError,
}: EditUserDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [roleType, setRoleType] = useState<UserRoleType>("staff");
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Fetch all venues for tenant selection
  const { data: venues } = useQuery({
    queryKey: ["venues-for-edit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name")
        .eq("is_suspended", false)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      
      // Determine current role type
      if (user.is_super_admin) {
        setRoleType("super_admin");
        setTenantId(null); // Super admins have no tenant
      } else {
        const tenantAdminRole = user.roles?.find(r => r.tenant_role === "tenant_admin");
        if (tenantAdminRole) {
          setRoleType("tenant_admin");
          setTenantId(tenantAdminRole.tenant_id);
        } else {
          setRoleType("staff");
          const staffRole = user.roles?.find(r => r.tenant_role === "staff" || r.tenant_id);
          setTenantId(staffRole?.tenant_id || user.venue_id);
        }
      }
    }
  }, [user]);

  // When role changes to super_admin, clear tenant
  useEffect(() => {
    if (roleType === "super_admin") {
      setTenantId(null);
    }
  }, [roleType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate: non-super-admin roles require a tenant
    if (roleType !== "super_admin" && !tenantId) {
      return; // Don't submit without tenant for non-super-admin
    }

    await onSave({
      userId: user.user_id,
      displayName,
      roleType,
      tenantId: roleType === "super_admin" ? null : tenantId,
    });
  };

  if (!user) return null;

  const requiresTenant = roleType !== "super_admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user information, role, and tenant assignment.
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

          <div className="space-y-2">
            <Label htmlFor="roleType">Role</Label>
            <Select 
              value={roleType} 
              onValueChange={(v) => setRoleType(v as UserRoleType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {roleType === "super_admin" && "Super Admins have global access and are not tied to any tenant."}
              {roleType === "tenant_admin" && "Tenant Admins have full control within their assigned venue."}
              {roleType === "staff" && "Staff can manage orders within their assigned venue."}
            </p>
          </div>

          {roleType === "super_admin" && (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Super Admins are <strong>not assigned to any tenant</strong>. They have platform-wide access.
              </AlertDescription>
            </Alert>
          )}

          {validationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {validationError}
              </AlertDescription>
            </Alert>
          )}

          {requiresTenant && (
            <div className="space-y-2">
              <Label htmlFor="tenant">Tenant (Venue)</Label>
              <Select 
                value={tenantId || ""} 
                onValueChange={(v) => setTenantId(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a venue..." />
                </SelectTrigger>
                <SelectContent>
                  {venues?.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!tenantId && (
                <p className="text-xs text-destructive">
                  A venue must be selected for {roleType === "tenant_admin" ? "Tenant Admins" : "Staff"}.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || (requiresTenant && !tenantId)}
            >
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
