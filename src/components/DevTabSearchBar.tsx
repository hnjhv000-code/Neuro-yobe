import React from 'react';
import { Search, X } from 'lucide-react';

interface DevTabSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  totalCount?: number;
  filteredCount?: number;
  className?: string;
}

export const DevTabSearchBar: React.FC<DevTabSearchBarProps> = ({
  value,
  onChange,
  placeholder,
  totalCount,
  filteredCount,
  className = ''
}) => {
  return (
    <div className={`relative flex items-center gap-2 p-2 rounded-2xl bg-[#070e1c] border border-cyan-900/60 focus-within:border-cyan-400/80 shadow-lg transition-all ${className}`}>
      <div className="flex items-center justify-center ps-2 text-cyan-400">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none py-1 pe-2"
      />

      {value && (
        <button
          onClick={() => onChange('')}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="مسح البحث"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {totalCount !== undefined && (
        <div className="shrink-0 pe-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/80 text-cyan-300">
            {value.trim() && filteredCount !== undefined ? `${filteredCount} من ${totalCount}` : `${totalCount}`}
          </span>
        </div>
      )}
    </div>
  );
};
