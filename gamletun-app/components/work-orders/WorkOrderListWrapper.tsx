'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import WorkOrderList from './WorkOrderList';
import { WorkOrder } from '@/lib/work-orders';

interface WorkOrderListWrapperProps {
  workOrders: WorkOrder[];
  showEquipmentName: boolean;
  showFilters?: boolean;
}

export default function WorkOrderListWrapper({ workOrders, showEquipmentName, showFilters }: WorkOrderListWrapperProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Wrap the refresh in a transition so React keeps the current list
  // interactive and we can show a lightweight "updating" indicator instead
  // of the UI silently freezing while the server re-renders.
  const handleStatusChange = () => {
    startTransition(() => router.refresh());
  };

  return (
    <div className="relative">
      {isPending && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-ink/15 overflow-hidden rounded-full">
          <div className="h-full w-1/3 bg-ink/60 animate-pulse motion-reduce:animate-none" />
        </div>
      )}
      <div className={isPending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <WorkOrderList
          workOrders={workOrders}
          showEquipmentName={showEquipmentName}
          onStatusChange={handleStatusChange}
          showFilters={showFilters}
        />
      </div>
    </div>
  );
}
