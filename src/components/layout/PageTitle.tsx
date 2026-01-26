import { cn } from '@/lib/utils';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
  /** Style variant for the accent */
  accent?: 'underline' | 'left-bar' | 'none';
}

/**
 * Consistent page title component with olive accent.
 * Use on all pages for visual anchoring.
 */
export default function PageTitle({ 
  title, 
  subtitle, 
  className,
  accent = 'left-bar'
}: PageTitleProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-start gap-3">
        {/* Left accent bar */}
        {accent === 'left-bar' && (
          <div className="w-1 h-8 bg-primary rounded-full flex-shrink-0 mt-0.5" />
        )}
        
        <div className="flex-1">
          <h1 
            className={cn(
              'text-2xl font-bold text-foreground',
              accent === 'underline' && 'relative pb-2'
            )}
          >
            {title}
            {/* Underline accent */}
            {accent === 'underline' && (
              <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-primary rounded-full" />
            )}
          </h1>
          
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
