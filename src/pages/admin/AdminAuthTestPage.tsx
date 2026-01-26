import { useState, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Play, 
  AlertTriangle,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'manual';

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'authorization' | 'timeout' | 'error-handling';
  isManual: boolean;
  status: TestStatus;
  result?: string;
}

const initialTests: TestCase[] = [
  // Authorization tests
  {
    id: 'staff-no-users',
    name: 'Staff cannot access /admin/users',
    description: 'Staff role should see Forbidden screen when accessing user management',
    category: 'authorization',
    isManual: false,
    status: 'pending',
  },
  {
    id: 'staff-no-menu',
    name: 'Staff cannot access /admin/menu',
    description: 'Staff role should see Forbidden screen when accessing menu management',
    category: 'authorization',
    isManual: false,
    status: 'pending',
  },
  {
    id: 'staff-no-bank',
    name: 'Staff cannot access /admin/bank-details',
    description: 'Staff role should see Forbidden screen when accessing bank details',
    category: 'authorization',
    isManual: false,
    status: 'pending',
  },
  {
    id: 'staff-yes-orders',
    name: 'Staff can access /admin/orders',
    description: 'Staff role should be able to access the orders dashboard',
    category: 'authorization',
    isManual: false,
    status: 'pending',
  },
  {
    id: 'admin-all-access',
    name: 'Admin can access all routes',
    description: 'Admin role has full access to all admin pages',
    category: 'authorization',
    isManual: false,
    status: 'pending',
  },
  // Timeout/Error handling tests (manual)
  {
    id: 'offline-error',
    name: 'Offline shows error within 4s',
    description: 'Turn off internet during dashboard load - should show error screen within 4 seconds (no infinite spinner)',
    category: 'timeout',
    isManual: true,
    status: 'manual',
  },
  {
    id: 'expired-session',
    name: 'Expired session redirects within 4s',
    description: 'Expired/invalid session should redirect to login within 4 seconds',
    category: 'timeout',
    isManual: true,
    status: 'manual',
  },
  {
    id: 'profile-500-error',
    name: 'Profile fetch 500 shows error screen',
    description: 'A 500 error during profile fetch should show error screen (not loading forever)',
    category: 'error-handling',
    isManual: true,
    status: 'manual',
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
    case 'manual':
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
    manual: { variant: 'secondary', label: 'Manual' },
  };

  const { variant, label } = variants[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export default function AdminAuthTestPage() {
  const [tests, setTests] = useState<TestCase[]>(initialTests);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = useCallback((id: string, updates: Partial<TestCase>) => {
    setTests(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const runAuthorizationTests = useCallback(async () => {
    setIsRunning(true);

    // Reset automated test statuses
    setTests(prev => prev.map(t => 
      t.isManual ? t : { ...t, status: 'pending', result: undefined }
    ));

    // Test 1: Check permission definitions for staff
    updateTest('staff-no-users', { status: 'running' });
    await new Promise(r => setTimeout(r, 500));
    
    // Verify the permission system by checking the permissions module
    const { getPermissions } = await import('@/lib/permissions');
    const staffPerms = getPermissions('staff');
    const adminPerms = getPermissions('admin');

    // Staff should NOT have canManageUsers
    if (!staffPerms.canManageUsers) {
      updateTest('staff-no-users', { 
        status: 'passed', 
        result: 'Permission system correctly blocks staff from user management' 
      });
    } else {
      updateTest('staff-no-users', { 
        status: 'failed', 
        result: 'ERROR: Staff has canManageUsers permission!' 
      });
    }

    // Test 2: Staff cannot access menu
    updateTest('staff-no-menu', { status: 'running' });
    await new Promise(r => setTimeout(r, 300));
    
    if (!staffPerms.canManageMenu) {
      updateTest('staff-no-menu', { 
        status: 'passed', 
        result: 'Permission system correctly blocks staff from menu management' 
      });
    } else {
      updateTest('staff-no-menu', { 
        status: 'failed', 
        result: 'ERROR: Staff has canManageMenu permission!' 
      });
    }

    // Test 3: Staff cannot access bank details
    updateTest('staff-no-bank', { status: 'running' });
    await new Promise(r => setTimeout(r, 300));
    
    if (!staffPerms.canManageBankDetails) {
      updateTest('staff-no-bank', { 
        status: 'passed', 
        result: 'Permission system correctly blocks staff from bank details' 
      });
    } else {
      updateTest('staff-no-bank', { 
        status: 'failed', 
        result: 'ERROR: Staff has canManageBankDetails permission!' 
      });
    }

    // Test 4: Staff CAN access orders
    updateTest('staff-yes-orders', { status: 'running' });
    await new Promise(r => setTimeout(r, 300));
    
    if (staffPerms.canAccessOrders) {
      updateTest('staff-yes-orders', { 
        status: 'passed', 
        result: 'Staff correctly has access to orders dashboard' 
      });
    } else {
      updateTest('staff-yes-orders', { 
        status: 'failed', 
        result: 'ERROR: Staff cannot access orders!' 
      });
    }

    // Test 5: Admin has all permissions
    updateTest('admin-all-access', { status: 'running' });
    await new Promise(r => setTimeout(r, 300));
    
    const adminHasAll = (
      adminPerms.canManageMenu &&
      adminPerms.canManageTables &&
      adminPerms.canAccessAnalytics &&
      adminPerms.canManageBankDetails &&
      adminPerms.canManageUsers &&
      adminPerms.canResetPasswords &&
      adminPerms.canAssignRoles &&
      adminPerms.canAccessOrders &&
      adminPerms.canModifyOwnPassword
    );

    if (adminHasAll) {
      updateTest('admin-all-access', { 
        status: 'passed', 
        result: 'Admin has all 9 permissions enabled' 
      });
    } else {
      updateTest('admin-all-access', { 
        status: 'failed', 
        result: 'ERROR: Admin is missing some permissions!' 
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
    <AdminLayout title="Auth & Authorization Tests" adminOnly>
      <div className="space-y-6">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Test Suite Summary
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
              Timeout & Error Handling Tests (Manual)
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

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manual Test Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <WifiOff className="h-4 w-4" />
                Offline Test
              </h4>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                <li>Sign out and go to /admin/login</li>
                <li>Open DevTools → Network → set to "Offline"</li>
                <li>Try to sign in or refresh the dashboard</li>
                <li>Verify error screen appears within 4 seconds</li>
              </ol>
            </div>
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
                <AlertTriangle className="h-4 w-4" />
                Profile Fetch Error Test
              </h4>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1 text-muted-foreground">
                <li>Open DevTools → Network → enable request blocking</li>
                <li>Block requests containing "profiles" or "user_roles"</li>
                <li>Refresh the dashboard</li>
                <li>Verify error screen appears (not infinite loading)</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
