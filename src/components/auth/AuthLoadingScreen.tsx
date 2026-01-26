import { Loader2 } from 'lucide-react';
import type { AuthState } from '@/contexts/AuthContext';

interface AuthLoadingScreenProps {
  authState: AuthState;
}

const stateMessages: Record<string, string> = {
  init: "Initializing...",
  checking_session: "Checking session...",
  loading_profile: "Loading profile...",
};

export default function AuthLoadingScreen({ authState }: AuthLoadingScreenProps) {
  const message = stateMessages[authState] || "Loading...";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
