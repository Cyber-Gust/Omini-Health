'use client';

import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface PeriodFiltersProps {
  onDateChange: (startDate: Date, endDate: Date) => void;
}

export default function PeriodFilters({ onDateChange }: PeriodFiltersProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(today));
  const [activeFilter, setActiveFilter] = useState('Este Mês');

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    let start, end;
    switch (filter) {
      case 'Últimos 30 dias':
        start = subDays(today, 29);
        end = today;
        break;
      case 'Este Ano':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case 'Este Mês':
      default:
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
    }
    setStartDate(start);
    setEndDate(end);
    onDateChange(start, end);
  };

  const handleDateInputChange = (date: Date, type: 'start' | 'end') => {
    setActiveFilter('Personalizado');
    if (type === 'start') {
      setStartDate(date);
      onDateChange(date, endDate);
    } else {
      setEndDate(date);
      onDateChange(startDate, date);
    }
  };

  const filters = ['Este Mês', 'Últimos 30 dias', 'Este Ano'];

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-border flex flex-col sm:flex-row items-center gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => handleFilterClick(filter)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              activeFilter === filter
                ? 'bg-light text-white font-semibold'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <input
          type="date"
          value={format(startDate, 'yyyy-MM-dd')}
          onChange={(e) => handleDateInputChange(new Date(e.target.value), 'start')}
          className="w-full rounded-md border-border bg-transparent py-2 px-4 focus:outline-none focus:ring-2 focus:ring-light text-muted text-sm"
        />
        <span className="text-muted">até</span>
        <input
          type="date"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={(e) => handleDateInputChange(new Date(e.target.value), 'end')}
          className="w-full rounded-md border-border bg-transparent py-2 px-4 focus:outline-none focus:ring-2 focus:ring-light text-muted text-sm"
        />
      </div>
    </div>
  );
}
