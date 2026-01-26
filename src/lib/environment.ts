// Environment detection utilities
// Non-production environments get access to dev/staging-only features

export type AppEnvironment = 'production' | 'staging' | 'development';

/**
 * Get the current app environment.
 * Reads from VITE_APP_ENV or infers from hostname.
 * Anything NOT explicitly 'production' is treated as non-prod.
 */
export function getAppEnvironment(): AppEnvironment {
  // First check explicit env var
  const envVar = import.meta.env.VITE_APP_ENV as string | undefined;
  
  if (envVar === 'production') {
    return 'production';
  }
  
  if (envVar === 'staging') {
    return 'staging';
  }
  
  if (envVar === 'development') {
    return 'development';
  }
  
  // Infer from hostname if no env var
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // Production patterns
  if (
    hostname === 'spush.lovable.app' || // Published URL
    hostname.endsWith('.lovable.app') && !hostname.includes('preview') // Non-preview lovable.app
  ) {
    return 'production';
  }
  
  // Preview/dev patterns
  if (
    hostname.includes('preview') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  ) {
    return 'development';
  }
  
  // Default to development for safety (non-prod gets staging features)
  return 'development';
}

/**
 * Check if current environment is production.
 * Used to gate staging-only features.
 */
export function isProduction(): boolean {
  return getAppEnvironment() === 'production';
}

/**
 * Check if staging/dev features should be available.
 * Returns true for anything that's NOT production.
 */
export function isNonProduction(): boolean {
  return !isProduction();
}
