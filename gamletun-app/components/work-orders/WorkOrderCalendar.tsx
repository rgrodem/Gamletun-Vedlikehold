'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaChevronLeft, FaChevronRight, FaTools, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
import { WorkOrder, statusColors, statusLabels, priorityColors, typeIcons } from '@/lib/work-orders';

interface WorkOrderCalendarProps {
  workOrders: WorkOrder[];
}

export default function WorkOrderCalendar({ workOrders }: WorkOrderCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Adjust for Monday start (Norwegian week starts on Monday)
  const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  // Group work orders by date
  const workOrdersByDate: Record<string, WorkOrder[]> = {};
  workOrders.forEach(wo => {
    if (wo.due_date) {
      const dateKey = wo.due_date.split('T')[0];
      if (!workOrdersByDate[dateKey]) {
        workOrdersByDate[dateKey] = [];
      }
      workOrdersByDate[dateKey].push(wo);
    }
  });

  const monthNames = [
    'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayNames = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Generate calendar days
  const calendarDays: (number | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < adjustedStartDay; i++) {
    calendarDays.push(null);
  }

  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Fill remaining cells to complete the grid
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaChevronLeft className="text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 min-w-[160px] text-center">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaChevronRight className="text-gray-600" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          I dag
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="min-h-[100px] bg-gray-50 rounded-lg" />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayWorkOrders = workOrdersByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isPast = new Date(dateStr) < new Date(todayStr);
            const hasOverdue = dayWorkOrders.some(wo =>
              isPast && ['open', 'scheduled', 'in_progress', 'waiting_parts'].includes(wo.status)
            );

            return (
              <div
                key={day}
                className={`min-h-[100px] p-1.5 rounded-lg border transition-colors ${
                  isToday
                    ? 'border-blue-500 bg-blue-50'
                    : hasOverdue
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-blue-600' : isPast ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {day}
                </div>

                <div className="space-y-1">
                  {dayWorkOrders.slice(0, 3).map(wo => (
                    <Link
                      key={wo.id}
                      href={`/equipment/${wo.equipment_id}`}
                      className={`block text-[10px] px-1.5 py-0.5 rounded truncate transition-colors ${
                        wo.type === 'corrective'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : wo.status === 'in_progress'
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                      title={`${wo.title} - ${wo.equipment?.name}`}
                    >
                      {typeIcons[wo.type]} {wo.title}
                    </Link>
                  ))}
                  {dayWorkOrders.length > 3 && (
                    <div className="text-[10px] text-gray-500 px-1.5">
                      +{dayWorkOrders.length - 3} flere
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-100 rounded" />
          <span>Planlagt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-100 rounded" />
          <span>Feil</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-purple-100 rounded" />
          <span>Pågår</span>
        </div>
      </div>
    </div>
  );
}
