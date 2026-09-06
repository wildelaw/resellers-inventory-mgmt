import { STATUS_LABELS, STATUS_BADGE_CLASSES, type ItemStatus } from '@/lib/constants';

export default function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}