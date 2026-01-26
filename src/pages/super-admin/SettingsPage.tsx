import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageTitle from "@/components/layout/PageTitle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddSuperAdminOpen, setIsAddSuperAdminOpen] = useState(false);
  const [newSuperAdminEmail, setNewSuperAdminEmail] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch super admins
  const { data: superAdmins, isLoading } = useQuery({
    queryKey: ["super-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("super_admins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Add super admin mutation
  const addSuperAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      // First find the user by email in profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .eq("email", email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error("User not found. They must have an account first.");

      // Check if already a super admin
      const { data: existing } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (existing) throw new Error("This user is already a super admin");

      // Add to super_admins
      const { error } = await supabase.from("super_admins").insert({
        user_id: profile.user_id,
        email,
        display_name: profile.display_name,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admins"] });
      setIsAddSuperAdminOpen(false);
      setNewSuperAdminEmail("");
      toast.success("Super admin added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add super admin");
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

  const handleAddSuperAdmin = () => {
    if (!newSuperAdminEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    addSuperAdminMutation.mutate(newSuperAdminEmail.trim());
  };

  return (
    <div className="p-6 space-y-6">
      <PageTitle title="Settings" subtitle="Platform configuration and super admin management" />

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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading...
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
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      {admin.display_name || "—"}
                      {admin.user_id === user?.id && (
                        <Badge variant="secondary" className="ml-2">You</Badge>
                      )}
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      {new Date(admin.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(admin.id)}
                        disabled={admin.user_id === user?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Super Admin Dialog */}
      <Dialog open={isAddSuperAdminOpen} onOpenChange={setIsAddSuperAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Super Admin</DialogTitle>
            <DialogDescription>
              The user must already have an account in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={newSuperAdminEmail}
                onChange={(e) => setNewSuperAdminEmail(e.target.value)}
              />
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
              {addSuperAdminMutation.isPending ? "Adding..." : "Add Super Admin"}
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
    </div>
  );
}
