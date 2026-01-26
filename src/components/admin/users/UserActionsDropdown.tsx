import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, KeyRound, Lock, UserX, UserCheck, Trash2 } from 'lucide-react';
import type { ManagedUser } from '@/hooks/useUserManagement';

interface UserActionsDropdownProps {
  user: ManagedUser;
  currentUserId: string;
  isAdmin: boolean;
  activeAdminCount: number;
  onEdit: () => void;
  onResetPassword: () => void;
  onModifyPassword: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

export default function UserActionsDropdown({
  user,
  currentUserId,
  isAdmin,
  activeAdminCount,
  onEdit,
  onResetPassword,
  onModifyPassword,
  onToggleActive,
  onDelete,
}: UserActionsDropdownProps) {
  const isSelf = user.user_id === currentUserId;
  const isLastAdmin = user.role === 'admin' && activeAdminCount <= 1;
  const canDelete = isAdmin && !isSelf && !isLastAdmin;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onResetPassword}>
          <KeyRound className="h-4 w-4 mr-2" />
          Reset Password
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onModifyPassword}>
          <Lock className="h-4 w-4 mr-2" />
          Modify Password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onToggleActive}
          className={user.is_active ? 'text-destructive' : 'text-primary'}
        >
          {user.is_active ? (
            <>
              <UserX className="h-4 w-4 mr-2" />
              Deactivate
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4 mr-2" />
              Activate
            </>
          )}
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
