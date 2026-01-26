import { isProduction } from '@/lib/environment';
import NotFound from '@/pages/NotFound';

interface StagingOnlyRouteProps {
  children: React.ReactNode;
}

/**
 * Wrapper that renders 404 in production, children in non-prod.
 * Use this to gate staging-only pages like /admin/auth-test.
 */
export default function StagingOnlyRoute({ children }: StagingOnlyRouteProps) {
  // In production, render 404 - not the component
  if (isProduction()) {
    return <NotFound />;
  }

  return <>{children}</>;
}
