import {
  LayoutDashboard,
  Search,
  Box,
  Layers,
  Activity,
  LineChart,
  Bookmark,
  BookCheck,
  History,
  Settings,
  X
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'scanner'
  | 'orderblocks'
  | 'liquidity'
  | 'xray'
  | 'chart'
  | 'watchlists'
  | 'journal'
  | 'historical'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  activeSymbol: string;
}

export function Sidebar({
  currentSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile,
  activeSymbol
}: SidebarProps) {
  const navItems: { id: NavSection; label: string; icon: typeof LayoutDashboard; kicker?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'scanner', label: 'Market Scanner', icon: Search },
    { id: 'orderblocks', label: 'Order Block Scanner', icon: Box, kicker: 'INSTITUTIONAL' },
    { id: 'liquidity', label: 'Liquidity Board', icon: Layers },
    { id: 'xray', label: 'Market X-Ray', icon: Activity },
    { id: 'chart', label: 'Stock Charts', icon: LineChart, kicker: activeSymbol },
    { id: 'watchlists', label: 'Watchlists', icon: Bookmark },
    { id: 'journal', label: 'Trading Journal', icon: BookCheck },
    { id: 'historical', label: 'Historical Analysis', icon: History },
    { id: 'settings', label: 'Settings & Data', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 lg:hidden">
          <span className="font-semibold text-white text-sm">Navigation</span>
          <button
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-white rounded"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Heading */}
        <div className="px-4 pt-4 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Market Workstation
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-2.5 py-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 font-semibold border-l-2 border-sky-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.kicker && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {item.kicker}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 text-[11px] text-slate-400 space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span>Market Hours:</span>
            <span className="font-mono text-slate-200">09:15 - 15:30 IST</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Market Segment:</span>
            <span className="font-mono text-sky-400">NSE Capital Mkt</span>
          </div>
          <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-900">
            Rule Engine v1.2 · Clean Math
          </div>
        </div>
      </aside>
    </>
  );
}
