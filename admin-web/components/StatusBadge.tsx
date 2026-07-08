export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'accent';

const STATUS_MAP: Record<string, BadgeVariant> = {
  // Study / Rides
  joined: 'success',
  removed: 'danger',
  // Claims
  pending_validation: 'warning',
  ready_to_claim: 'accent',
  paid: 'success',
  rejected: 'danger',
  // Tickets
  pending: 'warning',
  resolved: 'success',
  // Notifications
  unread: 'danger',
  read: 'muted',
  // Visibility
  true: 'success',
  false: 'muted',
};

const LABEL_MAP: Record<string, string> = {
  pending_validation: 'Pending',
  ready_to_claim: 'Ready',
  quota_reached_ready_for_cross_check: 'Quota Reached',
  compensation_claim_ready_for_validation: 'Claim Alert',
};

interface StatusBadgeProps {
  value: string | boolean;
  className?: string;
}

export default function StatusBadge({ value, className = '' }: StatusBadgeProps) {
  const key = String(value).toLowerCase();
  const variant: BadgeVariant = STATUS_MAP[key] ?? 'muted';
  const label = LABEL_MAP[key] ?? String(value).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <span className={`badge badge-${variant} ${className}`}>{label}</span>
  );
}
