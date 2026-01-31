import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusType =
  | 'draft'
  | 'confirmed'
  | 'revised'
  | 'archived'
  | 'posted'
  | 'paid'
  | 'partially_paid'
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'income'
  | 'expense';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; variant: string }> = {
  draft: { label: 'Draft', variant: 'bg-muted text-muted-foreground' },
  confirmed: { label: 'Confirmed', variant: 'bg-primary/10 text-primary' },
  revised: { label: 'Revised', variant: 'bg-accent text-accent-foreground' },
  archived: { label: 'Archived', variant: 'bg-secondary text-secondary-foreground' },
  posted: { label: 'Posted', variant: 'bg-chart-1/20 text-chart-1' },
  paid: { label: 'Paid', variant: 'bg-chart-3/20 text-chart-3' },
  partially_paid: { label: 'Partially Paid', variant: 'bg-chart-2/20 text-chart-2' },
  pending: { label: 'Pending', variant: 'bg-chart-5/20 text-chart-5' },
  completed: { label: 'Completed', variant: 'bg-chart-3/20 text-chart-3' },
  failed: { label: 'Failed', variant: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Cancelled', variant: 'bg-destructive/10 text-destructive' },
  income: { label: 'Income', variant: 'bg-chart-3/20 text-chart-3' },
  expense: { label: 'Expense', variant: 'bg-chart-1/20 text-chart-1' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'bg-muted text-muted-foreground' };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.variant,
        className
      )}
    >
      {config.label}
    </span>
  );
}
