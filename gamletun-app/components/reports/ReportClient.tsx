'use client';

import { useState } from 'react';
import { FaTractor, FaFilePdf, FaCalendarAlt, FaFilter } from 'react-icons/fa';
import { HiDocumentReport } from 'react-icons/hi';
import { BsCalendar3 } from 'react-icons/bs';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Equipment {
  id: string;
  name: string;
  category: { name: string } | null;
}

interface MaintenanceType {
  id: string;
  type_name: string;
}

interface MaintenanceLog {
  id: string;
  performed_date: string;
  description: string | null;
  equipment: {
    name: string;
    category: { name: string } | null;
  } | null;
  maintenance_type: {
    type_name: string;
  } | null;
}

interface ReportClientProps {
  equipment: Equipment[];
  maintenanceTypes: MaintenanceType[];
  initialLogs: MaintenanceLog[];
  initialStartDate: string;
  initialEndDate: string;
}

export default function ReportClient({
  equipment,
  maintenanceTypes,
  initialLogs,
  initialStartDate,
  initialEndDate,
}: ReportClientProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [logs, setLogs] = useState<MaintenanceLog[]>(initialLogs);
  const [loading, setLoading] = useState(false);

  // Quick month selection
  const selectMonth = (monthsAgo: number) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  // Fetch filtered data
  const fetchFilteredData = async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('maintenance_logs')
      .select(`
        *,
        equipment:equipment(name, category:categories(name)),
        maintenance_type:maintenance_types(type_name)
      `)
      .gte('performed_date', startDate)
      .lte('performed_date', endDate)
      .order('performed_date', { ascending: false });

    if (selectedEquipment !== 'all') {
      query = query.eq('equipment_id', selectedEquipment);
    }

    if (selectedType !== 'all') {
      query = query.eq('maintenance_type_id', selectedType);
    }

    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  // Generate PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('Gamletun Vedlikeholdsrapport', 14, 20);

    // Date range
    doc.setFontSize(11);
    doc.text(`Periode: ${new Date(startDate).toLocaleDateString('nb-NO')} - ${new Date(endDate).toLocaleDateString('nb-NO')}`, 14, 30);

    // Filters
    if (selectedEquipment !== 'all') {
      const eq = equipment.find(e => e.id === selectedEquipment);
      doc.text(`Utstyr: ${eq?.name || 'Ukjent'}`, 14, 36);
    }
    if (selectedType !== 'all') {
      const mt = maintenanceTypes.find(t => t.id === selectedType);
      doc.text(`Type: ${mt?.type_name || 'Ukjent'}`, 14, 42);
    }

    // Summary
    doc.setFontSize(12);
    doc.text(`Totalt antall vedlikehold: ${logs.length}`, 14, selectedType !== 'all' || selectedEquipment !== 'all' ? 48 : 42);

    // Table data
    const tableData = logs.map(log => [
      new Date(log.performed_date).toLocaleDateString('nb-NO'),
      log.equipment?.name || 'Ukjent',
      log.equipment?.category?.name || '-',
      log.maintenance_type?.type_name || 'Vedlikehold',
      log.description || '-'
    ]);

    autoTable(doc, {
      head: [['Dato', 'Utstyr', 'Kategori', 'Type', 'Beskrivelse']],
      body: tableData,
      startY: selectedType !== 'all' || selectedEquipment !== 'all' ? 54 : 48,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Save
    const filename = `Gamletun_Rapport_${startDate}_til_${endDate}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vedlikeholdsrapport</h1>
          <p className="text-sm text-gray-600 mt-1">Filtrer og eksporter vedlikeholdsdata</p>
        </div>
        <button
          onClick={generatePDF}
          disabled={logs.length === 0}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <FaFilePdf />
          Eksporter PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <FaFilter className="text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">Filtrering</h3>
        </div>

        {/* Quick month selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hurtigvalg
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectMonth(0)}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              Denne mnd
            </button>
            <button
              onClick={() => selectMonth(1)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Forrige mnd
            </button>
            <button
              onClick={() => selectMonth(2)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              2 mnd siden
            </button>
            <button
              onClick={() => selectMonth(3)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              3 mnd siden
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fra dato</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Til dato</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Equipment Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Utstyr</label>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Alle</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Alle</option>
              {maintenanceTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.type_name}</option>
              ))}
            </select>
          </div>

          {/* Update Button */}
          <div className="flex items-end">
            <button
              onClick={fetchFilteredData}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 text-sm"
            >
              {loading ? 'Laster...' : 'Oppdater'}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Totalt vedlikehold</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{logs.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <HiDocumentReport className="text-xl text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Unikt utstyr</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {new Set(logs.map(log => log.equipment?.name).filter(Boolean)).size}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <FaTractor className="text-xl text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Periode</p>
              <p className="text-sm font-bold text-gray-900 mt-1">
                {new Date(startDate).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })} - {new Date(endDate).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <BsCalendar3 className="text-xl text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Vedlikeholdslogger</h3>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <FaCalendarAlt className="text-4xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Ingen vedlikeholdslogger funnet for valgt periode</p>
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{log.equipment?.name || 'Ukjent'}</h4>
                      <p className="text-xs text-gray-500">{log.equipment?.category?.name || '-'}</p>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {log.maintenance_type?.type_name || 'Vedlikehold'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <FaCalendarAlt className="text-blue-600" />
                    <span>{new Date(log.performed_date).toLocaleDateString('nb-NO')}</span>
                  </div>
                  {log.description && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{log.description}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dato</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utstyr</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beskrivelse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(log.performed_date).toLocaleDateString('nb-NO')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {log.equipment?.name || 'Ukjent'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {log.equipment?.category?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {log.maintenance_type?.type_name || 'Vedlikehold'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {log.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
