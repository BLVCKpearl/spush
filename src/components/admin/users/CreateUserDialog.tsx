import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateUser } from '@/hooks/useUserManagement';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Copy, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string | null;
}

// Generate a random password
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

export default function CreateUserDialog({
  open,
  onOpenChange,
  tenantId,
}: CreateUserDialogProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createUser = useCreateUser();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !fullName || !role || !password) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (!tenantId) {
      toast({
        title: 'No tenant context',
        description: 'Cannot create user without tenant context.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createUser.mutateAsync({ email, fullName, role, password });
      setTempPassword(result.password || password);
      toast({
        title: 'User created',
        description: `${fullName} has been added as ${role === 'admin' ? 'an Admin' : 'Staff'}.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to create user',
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

  const handleGenerateNew = () => {
    const newPassword = generatePassword();
    setPassword(newPassword);
  };

  const handleClose = () => {
    setEmail('');
    setFullName('');
    setPassword(generatePassword());
    setShowPassword(false);
    setAutoGenerate(true);
    setRole('staff');
    setTempPassword(null);
    setCopied(false);
    onOpenChange(false);
  };

  const handleCreateAnother = () => {
    setEmail('');
    setFullName('');
    setPassword(generatePassword());
    setShowPassword(false);
    setAutoGenerate(true);
    setRole('staff');
    setTempPassword(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Add a new admin or staff member. They'll be able to log in immediately.
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-4">
            <Alert className="border-primary/20 bg-primary/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">User created successfully!</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Share these credentials securely with <strong>{fullName}</strong>. They should
                  change their password after first login.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-background p-2 rounded border">
                    <span className="text-xs text-muted-foreground w-16">Email:</span>
                    <code className="flex-1 text-sm font-mono break-all">{email}</code>
                  </div>
                  <div className="flex items-center gap-2 bg-background p-2 rounded border">
                    <span className="text-xs text-muted-foreground w-16">Password:</span>
                    <code className="flex-1 text-sm font-mono break-all">{tempPassword}</code>
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
                </div>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
              <Button onClick={handleCreateAnother}>
                Create Another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'staff')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admins can manage users, menu, and settings. Staff can only manage orders.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="auto-generate" className="text-xs text-muted-foreground cursor-pointer">
                    Auto-generate
                  </Label>
                  <Switch
                    id="auto-generate"
                    checked={autoGenerate}
                    onCheckedChange={(checked) => {
                      setAutoGenerate(checked);
                      if (checked) {
                        setPassword(generatePassword());
                      }
                    }}
                  />
                </div>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  readOnly={autoGenerate}
                  required
                  minLength={6}
                  className="pr-20"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  {autoGenerate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={handleGenerateNew}
                    >
                      New
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {autoGenerate
                  ? 'A secure password has been generated. You can reveal it or generate a new one.'
                  : 'Enter a password for the user (minimum 6 characters).'}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
