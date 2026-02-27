import { type ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="px-6 py-4 border-b border-gray-100">{children}</div>;
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  icon,
  color = 'blue',
}: {
  label: string;
  value: number | string;
  icon: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-700',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:        'bg-yellow-100 text-yellow-800',
    in_review:   'bg-blue-100 text-blue-800',
    resolved:    'bg-green-100 text-green-800',
    dismissed:   'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-800',
    completed:   'bg-green-100 text-green-800',
    cancelled:   'bg-red-100 text-red-800',
    full:        'bg-purple-100 text-purple-800',
    pending:     'bg-yellow-100 text-yellow-800',
    accepted:    'bg-green-100 text-green-800',
    rejected:    'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="text-4xl mb-2">📭</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-red-400">
      <p className="text-4xl mb-2">⚠️</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}
