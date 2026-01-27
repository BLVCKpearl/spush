import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface SetPasswordDialogProps {
  user: {
    user_id: string;
    email: string | null;
    display_name: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SetPasswordDialog({ user, open, onOpenChange }: SetPasswordDialogProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forceChange, setForceChange] = useState(true);
  const [copied, setCopied] = useState(false);
  const [successPassword, setSuccessPassword] = useState<string | null>(null);

  const setPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "service_set_password",
          userId,
          password: newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Set must_change_password flag if requested
      if (forceChange) {
        await supabase
          .from("profiles")
          .update({ must_change_password: true })
          .eq("user_id", userId);
      }

      // Log the action
      await supabase.from("admin_audit_logs").insert({
        action: "password_set_by_super_admin",
        actor_user_id: currentUser?.id || "",
        target_user_id: userId,
        metadata: { 
          force_change: forceChange,
          timestamp: new Date().toISOString() 
        },
      });

      return newPassword;
    },
    onSuccess: (newPassword) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-users"] });
      setSuccessPassword(newPassword);
      toast.success("Password set successfully");
    },
    onError: (error) => {
      toast.error(`Failed to set password: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || password.length < 6) return;
    setPasswordMutation.mutate({ userId: user.user_id, newPassword: password });
  };

  const handleCopy = async () => {
    if (!successPassword) return;
    await navigator.clipboard.writeText(successPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
    setForceChange(true);
    setCopied(false);
    setSuccessPassword(null);
    onOpenChange(false);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
    const array = new Uint8Array(12);
    crypto.getRandomValues(array);
    const newPassword = Array.from(array, (byte) => chars[byte % chars.length]).join("");
    setPassword(newPassword);
    setShowPassword(true);
  };

  if (!user) return null;

  // Show success state with password to copy
  if (successPassword) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Set Successfully</DialogTitle>
            <DialogDescription>
              The password has been set for {user.display_name || user.email}.
              {forceChange && " They will be required to change it on next login."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Copy and share this password securely. It will not be shown again.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="flex gap-2">
                <Input
                  value={successPassword}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Password</DialogTitle>
          <DialogDescription>
            Set a new password for {user.display_name || user.email}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 6 chars)"
                  className="pr-10"
                  minLength={6}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generateRandomPassword}
              >
                Generate
              </Button>
            </div>
            {password.length > 0 && password.length < 6 && (
              <p className="text-sm text-destructive">
                Password must be at least 6 characters
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="forceChange">Force password change</Label>
              <p className="text-sm text-muted-foreground">
                User must change password on next login
              </p>
            </div>
            <Switch
              id="forceChange"
              checked={forceChange}
              onCheckedChange={setForceChange}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={setPasswordMutation.isPending || password.length < 6}
            >
              {setPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting...
                </>
              ) : (
                "Set Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
