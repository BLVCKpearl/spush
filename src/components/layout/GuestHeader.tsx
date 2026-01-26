import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface GuestHeaderProps {
  /** Main title/context text */
  title: string;
  /** Optional subtitle or context (e.g., "Table 5") */
  subtitle?: string;
  /** Right-side content (e.g., cart badge) */
  rightContent?: React.ReactNode;
  /** Whether to show back navigation */
  showBack?: boolean;
  /** Back navigation URL */
  backUrl?: string;
  className?: string;
}

/**
 * Consistent guest-facing header with clean, minimal styling.
 * White background, subtle olive bottom divider, no shadows.
 */
export default function GuestHeader({
  title,
  subtitle,
  rightContent,
  showBack = false,
  backUrl = '/',
  className,
}: GuestHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-10 bg-background',
        // Subtle olive bottom divider (1px, low opacity)
        'border-b border-primary/10',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {showBack && (
            <Link 
              to={backUrl}
              className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Go back"
            >
              <svg 
                className="h-5 w-5 text-foreground" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 19l-7-7 7-7" 
                />
              </svg>
            </Link>
          )}
          
          <div>
            {/* Near-black text for app/page context */}
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        
        {rightContent && (
          <div className="flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
}
