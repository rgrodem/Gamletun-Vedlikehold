'use client';

import { useRouter } from 'next/navigation';
import WorkOrderList from './WorkOrderList';
import { WorkOrder } from '@/lib/work-orders';

interface WorkOrderListWrapperProps {
  workOrders: WorkOrder[];
  showEquipmentName: boolean;
}

export default function WorkOrderListWrapper({ workOrders, showEquipmentName }: WorkOrderListWrapperProps) {
  const router = useRouter();

  const handleStatusChange = () => {
    router.refresh();
  };

  return (
    <WorkOrderList
      workOrders={workOrders}
      showEquipmentName={showEquipmentName}
      onStatusChange={handleStatusChange}
    />
  );
}
