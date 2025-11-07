'use client';

import { useRouter } from 'next/navigation';
import WorkOrderList from './WorkOrderList';

interface WorkOrderListWrapperProps {
  workOrders: any[];
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
