import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageTitle from "@/components/layout/PageTitle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertTriangle, Plus, Shield, Trash2, Loader2, ToggleLeft, Building2, Eye, EyeOff, RefreshCw, MoreHorizontal, KeyRound, Ban, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useTenants } from "@/hooks/useTenantManagement";
import { useFeatureFlagsAdmin } from "@/hooks/useFeatureFlags";

// Available feature flags with descriptions
const AVAILABLE_FEATURES = [
  { key: 'cash_payments', label: 'Cash Payments', description: 'Allow customers to pay with cash on delivery' },
  { key: 'bank_transfers', label: 'Bank Transfers', description: 'Allow customers to pay via bank transfer' },
  { key: 'customer_name_required', label: 'Require Customer Name', description: 'Require customers to enter their name when ordering' },
  { key: 'show_estimated_time', label: 'Show Estimated Time', description: 'Display estimated preparation time to customers' },
  { key: 'advanced_analytics', label: 'Advanced Analytics', description: 'Enable advanced analytics and reporting features' },
  { key: 'multi_location', label: 'Multi-Location', description: 'Allow tenant to manage multiple venue locations' },
  { key: 'loyalty_program', label: 'Loyalty Program', description: 'Enable customer loyalty and rewards features' },
  { key: 'custom_branding', label: 'Custom Branding', description: 'Allow custom branding and white-labeling' },
];

// Generate a secure random password
function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddSuperAdminOpen, setIsAddSuperAdminOpen] = useState(false);
  const [newSuperAdminEmail, setNewSuperAdminEmail] = useState("");
  const [newSuperAdminDisplayName, setNewSuperAdminDisplayName] = useState("");
  const [newSuperAdminPassword, setNewSuperAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  
  // Reset password dialog state
  const [resetPasswordAdmin, setResetPasswordAdmin] = useState<{ id: string; user_id: string; email: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  // Suspend confirmation state
  const [suspendAdmin, setSuspendAdmin] = useState<{ id: string; user_id: string; email: string } | null>(null);
  const [reactivateAdmin, setReactivateAdmin] = useState<{ id: string; user_id: string; email: string } | null>(null);

  // Fetch super admins
  const { data: superAdmins, isLoading: superAdminsLoading } = useQuery({
    queryKey: ["super-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("super_admins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Array<{
        id: string;
        user_id: string;
        email: string;
        display_name: string | null;
        is_suspended: boolean;
        suspended_at: string | null;
        suspended_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
    },
  });

  // Fetch tenants for feature flags management
  const { data: tenants } = useTenants();

  // Feature flags for selected tenant
  const { flags: tenantFlags, updateFlag, isLoading: flagsLoading } = useFeatureFlagsAdmin(selectedTenantId ?? undefined);

  // Add super admin mutation - creates new user account
  const addSuperAdminMutation = useMutation({
    mutationFn: async ({ email, displayName, password }: { email: string; displayName: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "create_super_admin",
          email,
          displayName,
          password,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
      setIsAddSuperAdminOpen(false);
      resetAddSuperAdminForm();
      toast.success("Super admin created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create super admin");
    },
  });

  // Remove super admin mutation
  const removeSuperAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if this is the last super admin
      if (superAdmins && superAdmins.length <= 1) {
        throw new Error("Cannot remove the last super admin");
      }

      const { error } = await supabase
        .from("super_admins")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
      setDeleteConfirmId(null);
      toast.success("Super admin removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove super admin");
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "reset_super_admin_password",
          userId,
          password,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setResetPasswordAdmin(null);
      setResetPasswordValue("");
      setShowResetPassword(false);
      toast.success("Password reset successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reset password");
    },
  });

  // Suspend super admin mutation
  const suspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "suspend_super_admin",
          userId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
      setSuspendAdmin(null);
      toast.success("Super admin suspended");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to suspend super admin");
    },
  });

  // Reactivate super admin mutation
  const reactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "reactivate_super_admin",
          userId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
      setReactivateAdmin(null);
      toast.success("Super admin reactivated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reactivate super admin");
    },
  });

  const resetAddSuperAdminForm = () => {
    setNewSuperAdminEmail("");
    setNewSuperAdminDisplayName("");
    setNewSuperAdminPassword("");
    setShowPassword(false);
  };

  const handleGeneratePassword = () => {
    setNewSuperAdminPassword(generateSecurePassword());
    setShowPassword(true);
  };

  const handleAddSuperAdmin = () => {
    if (!newSuperAdminEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!newSuperAdminDisplayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (!newSuperAdminPassword || newSuperAdminPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    addSuperAdminMutation.mutate({
      email: newSuperAdminEmail.trim(),
      displayName: newSuperAdminDisplayName.trim(),
      password: newSuperAdminPassword,
    });
  };

  const handleToggleFlag = async (featureKey: string, currentValue: boolean) => {
    if (!selectedTenantId) return;
    try {
      await updateFlag(featureKey, !currentValue);
      toast.success(`Feature "${featureKey}" ${!currentValue ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error("Failed to update feature flag");
    }
  };

  const getFlagValue = (featureKey: string): boolean => {
    const flag = tenantFlags.find((f) => f.feature_key === featureKey);
    return flag?.is_enabled ?? false;
  };

  return (
    <div className="p-6 space-y-6">
      <PageTitle title="Settings" subtitle="Platform configuration and super admin management" />

      <Tabs defaultValue="super-admins" className="space-y-6">
        <TabsList>
          <TabsTrigger value="super-admins" className="gap-2">
            <Shield className="h-4 w-4" />
            Super Admins
          </TabsTrigger>
          <TabsTrigger value="feature-flags" className="gap-2">
            <ToggleLeft className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="super-admins">
          {/* Super Admins Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Super Admins
                  </CardTitle>
                  <CardDescription>
                    Users with global access to all tenants and platform settings
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddSuperAdminOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Super Admin
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {superAdminsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : superAdmins?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No super admins found
                      </TableCell>
                    </TableRow>
                  ) : (
                    superAdmins?.map((admin) => (
                      <TableRow key={admin.id} className={admin.is_suspended ? "opacity-60" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {admin.display_name || "—"}
                            {admin.user_id === user?.id && (
                              <Badge variant="secondary">You</Badge>
                            )}
                            {admin.is_suspended && (
                              <Badge variant="destructive">Suspended</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          {new Date(admin.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={admin.user_id === user?.id}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setResetPasswordAdmin({ id: admin.id, user_id: admin.user_id, email: admin.email });
                                  setResetPasswordValue("");
                                  setShowResetPassword(false);
                                }}
                              >
                                <KeyRound className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              {admin.is_suspended ? (
                                <DropdownMenuItem
                                  onClick={() => setReactivateAdmin({ id: admin.id, user_id: admin.user_id, email: admin.email })}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Reactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => setSuspendAdmin({ id: admin.id, user_id: admin.user_id, email: admin.email })}
                                  className="text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirmId(admin.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feature-flags">
          {/* Feature Flags Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5" />
                Feature Flags
              </CardTitle>
              <CardDescription>
                Enable or disable features for specific tenants at runtime
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tenant Selector */}
              <div className="space-y-2">
                <Label>Select Tenant</Label>
                <Select
                  value={selectedTenantId ?? ""}
                  onValueChange={(value) => setSelectedTenantId(value || null)}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a tenant to manage features..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {tenant.name}
                          <span className="text-muted-foreground">({tenant.venue_slug})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Feature Flags List */}
              {selectedTenantId ? (
                flagsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {AVAILABLE_FEATURES.map((feature) => (
                      <div
                        key={feature.key}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="space-y-1">
                          <div className="font-medium">{feature.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {feature.description}
                          </div>
                        </div>
                        <Switch
                          checked={getFlagValue(feature.key)}
                          onCheckedChange={() =>
                            handleToggleFlag(feature.key, getFlagValue(feature.key))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a tenant to manage their feature flags
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Super Admin Dialog */}
      <Dialog open={isAddSuperAdminOpen} onOpenChange={(open) => {
        setIsAddSuperAdminOpen(open);
        if (!open) resetAddSuperAdminForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Super Admin</DialogTitle>
            <DialogDescription>
              Create a new user account with super admin privileges.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="John Doe"
                value={newSuperAdminDisplayName}
                onChange={(e) => setNewSuperAdminDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={newSuperAdminEmail}
                onChange={(e) => setNewSuperAdminEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={newSuperAdminPassword}
                    onChange={(e) => setNewSuperAdminPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGeneratePassword}
                  title="Generate password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this password securely with the new admin.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSuperAdminOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSuperAdmin}
              disabled={addSuperAdminMutation.isPending}
            >
              {addSuperAdminMutation.isPending ? "Creating..." : "Create Super Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Remove Super Admin
            </DialogTitle>
            <DialogDescription>
              This will revoke their global platform access. They will only have access to
              tenants where they have specific roles assigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && removeSuperAdminMutation.mutate(deleteConfirmId)}
              disabled={removeSuperAdminMutation.isPending}
            >
              {removeSuperAdminMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordAdmin} onOpenChange={(open) => {
        if (!open) {
          setResetPasswordAdmin(null);
          setResetPasswordValue("");
          setShowResetPassword(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetPasswordAdmin?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resetPassword">New Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="resetPassword"
                    type={showResetPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setResetPasswordValue(generateSecurePassword());
                    setShowResetPassword(true);
                  }}
                  title="Generate password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this password securely with the admin.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordAdmin(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!resetPasswordAdmin || !resetPasswordValue || resetPasswordValue.length < 6) {
                  toast.error("Password must be at least 6 characters");
                  return;
                }
                resetPasswordMutation.mutate({
                  userId: resetPasswordAdmin.user_id,
                  password: resetPasswordValue,
                });
              }}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <Dialog open={!!suspendAdmin} onOpenChange={() => setSuspendAdmin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Suspend Super Admin
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend <strong>{suspendAdmin?.email}</strong>?
              They will be unable to log in until reactivated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendAdmin(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => suspendAdmin && suspendMutation.mutate(suspendAdmin.user_id)}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? "Suspending..." : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Confirmation Dialog */}
      <Dialog open={!!reactivateAdmin} onOpenChange={() => setReactivateAdmin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Reactivate Super Admin
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reactivate <strong>{reactivateAdmin?.email}</strong>?
              They will regain full super admin access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateAdmin(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => reactivateAdmin && reactivateMutation.mutate(reactivateAdmin.user_id)}
              disabled={reactivateMutation.isPending}
            >
              {reactivateMutation.isPending ? "Reactivating..." : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
