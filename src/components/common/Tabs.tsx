import React from 'react';

interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-[#E9ECEF] rounded-lg max-w-full overflow-x-auto">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-white text-[#0B0D11] shadow-xs'
                : 'text-[#495057] hover:text-[#0B0D11]'
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-sm font-mono tabular-nums ${
                isActive ? 'bg-[#F1F3F5] text-[#212529]' : 'text-[#6C757D]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
