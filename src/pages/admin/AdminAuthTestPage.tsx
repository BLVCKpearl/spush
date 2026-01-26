import { useState, useCallback, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  AlertTriangle,
  Shield,
  WifiOff,
  RefreshCw,
  FlaskConical,
  Info
} from 'lucide-react';
import { getAppEnvironment, isNonProduction } from '@/lib/environment';

type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'awaiting_manual';

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'authorization' | 'timeout' | 'error-handling' | 'redirect';
  isManual: boolean;
  status: TestStatus;
  result?: string;
}

const initialTests: TestCase[] = [
  // Authorization tests (automated)
  {
    id: 'staff-blocked-users',
    name: 'Role mismatch: staff blocked from /admin/users',
    description: 'Staff role should see Forbidden screen when accessing user management',
    category: 'authorization',
    isManual: false,
    status: 'pending',
  },
  {
    id: 'admin-allowed-users',
    name: 'Admin allowed on /admin/users',
    description: 'Admin role should have full access to user management',
    category: 'authorization',
    isManual: false,
    status: 'pending',
  },
  // Timeout/Error handling tests (manual verification required)
  {
    id: 'expired-session',
    name: 'Expired session → redirect to /admin/login within 4 seconds',
    description: 'Expired/invalid session should redirect to login within 4 seconds',
    category: 'timeout',
    isManual: true,
    status: 'awaiting_manual',
  },
  {
    id: 'offline-error',
    name: 'Offline mode → error screen appears within 4 seconds',
    description: 'Turn off internet during dashboard load - should show error screen within 4 seconds (no spinner loop)',
    category: 'error-handling',
    isManual: true,
    status: 'awaiting_manual',
  },
  {
    id: 'profile-500-error',
    name: 'Profile fetch error (simulate 500) → error screen within 4 seconds',
    description: 'A 500 error during profile fetch should show error screen (not loading forever)',
    category: 'error-handling',
    isManual: true,
    status: 'awaiting_manual',
  },
  // Redirect tests (manual)
  {
    id: 'force-reset-redirect',
    name: '"Force reset" user gets redirected to /admin/force-reset',
    description: 'User with must_change_password=true should be redirected to force reset page',
    category: 'redirect',
    isManual: true,
    status: 'awaiting_manual',
  },
];

function StatusIcon({ status }: { status: TestStatus }) {
  switch (status) {
    case 'passed':
      return <CheckCircle2 className="h-5 w-5 text-primary" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-destructive" />;
    case 'running':
      return <RefreshCw className="h-5 w-5 text-primary animate-spin" />;
    case 'awaiting_manual':
      return <AlertTriangle className="h-5 w-5 text-accent-foreground" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: TestStatus }) {
  const variants: Record<TestStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    pending: { variant: 'secondary', label: 'Pending' },
    running: { variant: 'default', label: 'Running' },
    passed: { variant: 'outline', label: 'Passed' },
    failed: { variant: 'destructive', label: 'Failed' },
    awaiting_manual: { variant: 'secondary', label: 'Awaiting Manual Test' },
  };

  const { variant, label } = variants[status];
  return <Badge variant={variant}>{label}</Badge>;
}

// Simulation context for profile fetch failure
const SIMULATE_PROFILE_FAILURE_KEY = 'auth_test_simulate_profile_failure';

export function shouldSimulateProfileFailure(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isNonProduction()) return false;
  return localStorage.getItem(SIMULATE_PROFILE_FAILURE_KEY) === 'true';
}

export default function AdminAuthTestPage() {
  const [tests, setTests] = useState<TestCase[]>(initialTests);
  const [isRunning, setIsRunning] = useState(false);
  const [simulateProfileFailure, setSimulateProfileFailure] = useState(false);
  
  const environment = getAppEnvironment();

  // Load simulation state
  useEffect(() => {
    const stored = localStorage.getItem(SIMULATE_PROFILE_FAILURE_KEY) === 'true';
    setSimulateProfileFailure(stored);
  }, []);

  const updateTest = useCallback((id: string, updates: Partial<TestCase>) => {
    setTests(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const handleSimulateProfileFailureChange = useCallback((checked: boolean) => {
    setSimulateProfileFailure(checked);
    if (checked) {
      localStorage.setItem(SIMULATE_PROFILE_FAILURE_KEY, 'true');
    } else {
      localStorage.removeItem(SIMULATE_PROFILE_FAILURE_KEY);
    }
  }, []);

  const runAuthorizationTests = useCallback(async () => {
    setIsRunning(true);

    // Reset automated test statuses
    setTests(prev => prev.map(t => 
      t.isManual ? t : { ...t, status: 'pending', result: undefined }
    ));

    // Test 1: Check permission definitions for staff being blocked from /admin/users
    updateTest('staff-blocked-users', { status: 'running' });
    await new Promise(r => setTimeout(r, 500));
    
    // Verify the permission system by checking the permissions module
    const { getPermissions } = await import('@/lib/permissions');
    const staffPerms = getPermissions('staff');
    const adminPerms = getPermissions('admin');

    // Staff should NOT have canManageUsers
    if (!staffPerms.canManageUsers) {
      updateTest('staff-blocked-users', { 
        status: 'passed', 
        result: 'Permission system correctly blocks staff from user management (canManageUsers=false)' 
      });
    } else {
      updateTest('staff-blocked-users', { 
        status: 'failed', 
        result: 'ERROR: Staff has canManageUsers permission!' 
      });
    }

    // Test 2: Admin allowed on /admin/users
    updateTest('admin-allowed-users', { status: 'running' });
    await new Promise(r => setTimeout(r, 300));
    
    if (adminPerms.canManageUsers) {
      updateTest('admin-allowed-users', { 
        status: 'passed', 
        result: 'Admin has canManageUsers=true, full access to user management' 
      });
    } else {
      updateTest('admin-allowed-users', { 
        status: 'failed', 
        result: 'ERROR: Admin lacks canManageUsers permission!' 
      });
    }

    setIsRunning(false);
  }, [updateTest]);

  const markManualTest = useCallback((id: string, passed: boolean) => {
    updateTest(id, { 
      status: passed ? 'passed' : 'failed',
      result: passed ? 'Manually verified as working' : 'Manually marked as failed'
    });
  }, [updateTest]);

  const resetTests = useCallback(() => {
    setTests(initialTests);
  }, []);

  const automatedTests = tests.filter(t => !t.isManual);
  const manualTests = tests.filter(t => t.isManual);
  
  const passedCount = tests.filter(t => t.status === 'passed').length;
  const failedCount = tests.filter(t => t.status === 'failed').length;

  return (
    <AdminLayout title="Auth Smoke Test (Non-Prod Only)" adminOnly>
      <div className="space-y-6">
        {/* Environment Banner */}
        <Alert>
          <FlaskConical className="h-4 w-4" />
          <AlertTitle>Staging/Dev Environment</AlertTitle>
          <AlertDescription>
            Current environment: <Badge variant="outline">{environment}</Badge>
            <span className="text-muted-foreground ml-2">
              This page is only accessible in non-production. In production, this route returns 404.
            </span>
          </AlertDescription>
        </Alert>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Auth Smoke Test Suite
            </CardTitle>
            <CardDescription>
              Verify authentication and authorization behavior across the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex gap-2 items-center">
                <Badge variant="outline" className="text-primary border-primary">
                  {passedCount} Passed
                </Badge>
                <Badge variant="outline" className="text-destructive border-destructive">
                  {failedCount} Failed
                </Badge>
                <Badge variant="secondary">
                  {tests.length - passedCount - failedCount} Pending
                </Badge>
              </div>
              <div className="flex gap-2 ml-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetTests}
                  disabled={isRunning}
                >
                  Reset All
                </Button>
                <Button 
                  size="sm" 
                  onClick={runAuthorizationTests}
                  disabled={isRunning}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Automated Tests
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simulation Utilities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FlaskConical className="h-5 w-5" />
              Simulation Utilities (Safe - Non-Prod Only)
            </CardTitle>
            <CardDescription>
              Toggle simulations to test error handling. These only work in non-production environments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Fetch Failure Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-1">
                <Label htmlFor="simulate-profile-failure" className="font-medium">
                  Simulate Profile Fetch Failure
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, the next page load will simulate a profile fetch failure. 
                  Refresh the page after enabling to test error handling.
                </p>
              </div>
              <Switch
                id="simulate-profile-failure"
                checked={simulateProfileFailure}
                onCheckedChange={handleSimulateProfileFailureChange}
              />
            </div>

            {simulateProfileFailure && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Simulation Active</AlertTitle>
                <AlertDescription>
                  Profile fetch failure simulation is ON. Refresh the page to trigger the error screen. 
                  Toggle off to restore normal behavior.
                </AlertDescription>
              </Alert>
            )}

            {/* Offline Mode Instructions */}
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-start gap-3">
                <WifiOff className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium">Simulate Offline Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    To test offline behavior without modifying browser network:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
                    <li>Open DevTools (F12) → Network tab</li>
                    <li>Click the "No throttling" dropdown</li>
                    <li>Select "Offline"</li>
                    <li>Refresh the page and observe error handling</li>
                    <li>Re-enable network after testing</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automated Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Authorization Tests (Automated)</CardTitle>
            <CardDescription>
              These tests verify the permission system programmatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {automatedTests.map(test => (
              <div 
                key={test.id} 
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <StatusIcon status={test.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{test.name}</span>
                    <StatusBadge status={test.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {test.description}
                  </p>
                  {test.result && (
                    <p className={`text-sm mt-2 ${test.status === 'passed' ? 'text-primary' : 'text-destructive'}`}>
                      → {test.result}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Manual Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <WifiOff className="h-5 w-5" />
              Timeout & Error Handling Tests (Manual Verification)
            </CardTitle>
            <CardDescription>
              These tests require manual verification. Follow the instructions and mark as passed/failed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {manualTests.map(test => (
              <div 
                key={test.id} 
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <StatusIcon status={test.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{test.name}</span>
                    <StatusBadge status={test.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {test.description}
                  </p>
                  {test.result && (
                    <p className={`text-sm mt-2 ${test.status === 'passed' ? 'text-primary' : 'text-destructive'}`}>
                      → {test.result}
                    </p>
                  )}
                  {test.status !== 'passed' && test.status !== 'failed' && (
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-primary border-primary hover:bg-primary/10"
                        onClick={() => markManualTest(test.id, true)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Mark Passed
                      </Button>
                      <Button
                        size="sm" 
                        variant="outline"
                        className="text-destructive border-destructive hover:bg-destructive/10"
                        onClick={() => markManualTest(test.id, false)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Mark Failed
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Manual Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5" />
              Manual Test Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Expired Session Test
              </h4>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                <li>Open DevTools → Application → Storage</li>
                <li>Delete all Supabase auth tokens from localStorage</li>
                <li>Refresh the page</li>
                <li>Verify redirect to /admin/login within 4 seconds</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <WifiOff className="h-4 w-4" />
                Offline Test
              </h4>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                <li>Sign out and go to /admin/login</li>
                <li>Open DevTools → Network → set to "Offline"</li>
                <li>Try to sign in or refresh the dashboard</li>
                <li>Verify error screen appears within 4 seconds (no infinite spinner)</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Profile Fetch Error Test
              </h4>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                <li>Enable "Simulate Profile Fetch Failure" toggle above</li>
                <li>Refresh the page</li>
                <li>Verify error screen appears (not infinite loading)</li>
                <li>Disable the toggle to restore normal behavior</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Force Reset Redirect Test
              </h4>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                <li>Create a test user or update an existing user's profile</li>
                <li>Set must_change_password = true in their profile</li>
                <li>Sign in as that user</li>
                <li>Verify redirect to /admin/force-reset</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
