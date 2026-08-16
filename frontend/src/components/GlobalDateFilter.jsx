import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all_time' }
];

const GlobalDateFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPreset = searchParams.get('preset') || 'this_month';
  const currentFrom = searchParams.get('from');
  const currentTo = searchParams.get('to');

  const [isCustom, setIsCustom] = useState(!!currentFrom);
  const [fromDate, setFromDate] = useState(
    currentFrom ? new Date(parseInt(currentFrom)).toISOString().split('T')[0] : ''
  );
  const [toDate, setToDate] = useState(
    currentTo ? new Date(parseInt(currentTo)).toISOString().split('T')[0] : ''
  );

  const handlePresetClick = (presetValue) => {
    setIsCustom(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('preset', presetValue);
    newParams.delete('from');
    newParams.delete('to');
    setSearchParams(newParams);
  };

  const handleCustomApply = () => {
    if (!fromDate || !toDate) return;
    
    // Convert YYYY-MM-DD to timestamps
    const fromTs = new Date(fromDate + 'T00:00:00').getTime();
    const toTs = new Date(toDate + 'T23:59:59').getTime();
    
    const newParams = new URLSearchParams(searchParams);
    newParams.set('from', fromTs);
    newParams.set('to', toTs);
    newParams.delete('preset');
    setSearchParams(newParams);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-8 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-2 text-slate-500 font-semibold text-sm">
            <Calendar className="w-4 h-4" />
            <span>Filter:</span>
          </div>
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePresetClick(p.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                !isCustom && currentPreset === p.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              isCustom
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Custom Range Picker */}
        {isCustom && (
          <div className="flex items-center gap-3 animate-fade-in bg-slate-50 p-2 rounded-lg border border-slate-200">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-slate-500 text-sm">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleCustomApply}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalDateFilter;
