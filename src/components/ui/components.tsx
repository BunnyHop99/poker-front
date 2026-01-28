import { X } from 'lucide-react';
import { useEffect } from 'react';

// ============================================================================
// CARD
// ============================================================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export function Card({ children, className = '', title, subtitle, action, noPadding }: CardProps) {
  return (
    <div className={`bg-charcoal border border-graphite rounded-xl ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-graphite">
          <div>
            {title && <h3 className="font-semibold text-pearl">{title}</h3>}
            {subtitle && <p className="text-sm text-silver mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
}

// ============================================================================
// MODAL
// ============================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-midnight/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`
            relative w-full ${sizes[size]}
            bg-charcoal border border-graphite rounded-xl shadow-2xl
            transform transition-all
            animate-[fadeIn_0.2s_ease-out]
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-graphite">
            <h2 className="text-lg font-semibold text-pearl">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-silver hover:text-pearl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-graphite">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BADGE
// ============================================================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variants = {
    default: 'bg-graphite text-silver',
    success: 'bg-emerald/20 text-emerald border-emerald/30',
    warning: 'bg-amber/20 text-amber border-amber/30',
    error: 'bg-ruby/20 text-ruby border-ruby/30',
    info: 'bg-sapphire/20 text-sapphire border-sapphire/30',
    gold: 'bg-gold/20 text-gold border-gold/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${variants[variant]} ${sizes[size]}
      `}
    >
      {children}
    </span>
  );
}

// ============================================================================
// TABLE
// ============================================================================

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No hay datos',
  isLoading,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-silver">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-graphite">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-sm font-medium text-silver ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={`
                border-b border-graphite/50 last:border-0
                ${onRowClick ? 'cursor-pointer hover:bg-white/5' : ''}
                transition-colors
              `}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-pearl ${col.className || ''}`}>
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: { value: number; label: string };
  color?: 'gold' | 'emerald' | 'ruby' | 'sapphire' | 'amber';
}

export function StatCard({ label, value, icon, change, color = 'gold' }: StatCardProps) {
  const colors = {
    gold: 'from-gold/20 to-gold/5 border-gold/30 text-gold',
    emerald: 'from-emerald/20 to-emerald/5 border-emerald/30 text-emerald',
    ruby: 'from-ruby/20 to-ruby/5 border-ruby/30 text-ruby',
    sapphire: 'from-sapphire/20 to-sapphire/5 border-sapphire/30 text-sapphire',
    amber: 'from-amber/20 to-amber/5 border-amber/30 text-amber',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-silver text-sm">{label}</span>
        {icon && <span className={colors[color].split(' ').pop()}>{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-pearl">{value}</p>
      {change && (
        <p className={`text-sm mt-1 ${change.value >= 0 ? 'text-emerald' : 'text-ruby'}`}>
          {change.value >= 0 ? '+' : ''}
          {change.value}% {change.label}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="flex justify-center mb-4 text-silver">{icon}</div>}
      <h3 className="text-lg font-medium text-pearl mb-1">{title}</h3>
      {description && <p className="text-silver mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ============================================================================
// LOADING SPINNER
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizes[size]} border-gold/30 border-t-gold rounded-full animate-spin ${className}`}
    />
  );
}

// ============================================================================
// ALERT
// ============================================================================

interface AlertProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export function Alert({ type, title, children, onClose }: AlertProps) {
  const styles = {
    success: 'bg-emerald/10 border-emerald/30 text-emerald',
    warning: 'bg-amber/10 border-amber/30 text-amber',
    error: 'bg-ruby/10 border-ruby/30 text-ruby',
    info: 'bg-sapphire/10 border-sapphire/30 text-sapphire',
  };

  return (
    <div className={`${styles[type]} border rounded-lg p-4 relative`}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {title && <h4 className="font-medium mb-1">{title}</h4>}
      <div className="text-sm opacity-90">{children}</div>
    </div>
  );
}
