import React, { useState } from 'react';

/**
 * Enterprise Financial Volume & Spend Trend Area Chart (Clean Stripe/Ramp Style)
 */
export function VolumeTrendChart({ data = [], height = 180 }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const points = data.length > 0 ? data : [
    { label: '09:00', amount: 0, count: 0 },
    { label: '11:00', amount: 35, count: 1 },
    { label: '13:00', amount: 50, count: 2 },
    { label: '15:00', amount: 85, count: 3 },
    { label: '17:00', amount: 120, count: 4 },
    { label: '19:00', amount: 165, count: 6 },
    { label: '21:00', amount: 210, count: 7 },
  ];

  const maxVal = Math.max(...points.map((p) => p.amount), 50) * 1.15;
  const svgWidth = 600;
  const svgHeight = height;
  const paddingX = 45;
  const paddingY = 25;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  const coords = points.map((p, i) => {
    const x = paddingX + (i / (points.length - 1)) * chartWidth;
    const y = svgHeight - paddingY - (p.amount / maxVal) * chartHeight;
    return { x, y, ...p };
  });

  const pathD = coords.reduce((acc, c, i) => {
    return i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${svgHeight - paddingY} L ${coords[0].x} ${svgHeight - paddingY} Z`;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg 
        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
        className="w-full h-auto overflow-visible"
      >
        <defs>
          <linearGradient id="fintechAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#356AE6" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#356AE6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Clean Grid Lines */}
        {[0, 0.33, 0.66, 1].map((ratio, idx) => {
          const y = svgHeight - paddingY - ratio * chartHeight;
          const val = Math.round(ratio * maxVal);
          return (
            <g key={idx}>
              <line 
                x1={paddingX} 
                y1={y} 
                x2={svgWidth - paddingX} 
                y2={y} 
                stroke="#E7EAF0" 
                strokeDasharray="3 3" 
                strokeWidth="1" 
                className="dark:stroke-[#243347]"
              />
              <text 
                x={paddingX - 10} 
                y={y + 3} 
                fill="#667085" 
                fontSize="10" 
                textAnchor="end" 
                fontFamily="inherit"
                className="dark:fill-[#98A2B3]"
              >
                ${val}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#fintechAreaGradient)" />

        {/* Top stroke line */}
        <path 
          d={pathD} 
          fill="none" 
          stroke="#356AE6" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Data points */}
        {coords.map((c, idx) => (
          <g key={idx} onMouseEnter={() => setHoverIndex(idx)} onMouseLeave={() => setHoverIndex(null)}>
            <circle
              cx={c.x}
              cy={c.y}
              r={hoverIndex === idx ? 5.5 : 3.5}
              fill="#FFFFFF"
              stroke="#356AE6"
              strokeWidth="2"
              className="cursor-pointer transition-all"
            />
            <text
              x={c.x}
              y={svgHeight - 6}
              fill="#667085"
              fontSize="10"
              textAnchor="middle"
              className="dark:fill-[#98A2B3]"
            >
              {c.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Hover Tooltip */}
      {hoverIndex !== null && coords[hoverIndex] && (
        <div 
          className="absolute pointer-events-none p-2 rounded-lg bg-[#172033] dark:bg-[#182230] text-white shadow-lg text-xs z-20 transition-all -translate-x-1/2 -translate-y-full"
          style={{ 
            left: `${(coords[hoverIndex].x / svgWidth) * 100}%`, 
            top: `${(coords[hoverIndex].y / svgHeight) * 100 - 8}%` 
          }}
        >
          <div className="font-bold text-white">${coords[hoverIndex].amount.toFixed(2)} USD</div>
          <div className="text-[10px] text-[#98A2B3]">{coords[hoverIndex].count} txs @ {coords[hoverIndex].label}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Category Breakdown Horizontal Distribution (Stripe Style)
 */
export function CategoryDistributionBar({ categories = [] }) {
  const defaultCats = categories.length > 0 ? categories : [
    { name: 'AI Models & Datasets', amount: 85, color: 'bg-[#356AE6]' },
    { name: 'Software & SaaS Tools', amount: 45, color: 'bg-[#16865C]' },
    { name: 'Cloud Infrastructure', amount: 25, color: 'bg-[#6941C6]' },
    { name: 'API Credits & Tokens', amount: 15, color: 'bg-[#C58B24]' }
  ];

  const total = defaultCats.reduce((acc, c) => acc + c.amount, 0) || 1;

  return (
    <div className="space-y-3">
      {/* Clean stacked bar */}
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-[#F2F4F7] dark:bg-[#1F2C3F] gap-0.5">
        {defaultCats.map((cat, idx) => {
          const widthPct = (cat.amount / total) * 100;
          return (
            <div
              key={idx}
              className={`${cat.color} transition-all`}
              style={{ width: `${widthPct}%` }}
              title={`${cat.name}: $${cat.amount} (${Math.round(widthPct)}%)`}
            />
          );
        })}
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {defaultCats.map((cat, idx) => {
          const pct = Math.round((cat.amount / total) * 100);
          return (
            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#F8F9FB] dark:bg-[#141C28] border border-[#E7EAF0] dark:border-[#243347]">
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full ${cat.color} shrink-0`} />
                <span className="text-[#172033] dark:text-[#F2F4F7] truncate text-xs">{cat.name}</span>
              </div>
              <span className="text-[#667085] dark:text-[#98A2B3] shrink-0 text-xs font-semibold">${cat.amount} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Approval vs Rejection Ratio Ring (Clean Enterprise Style)
 */
export function PipelineRatioRing({ approved = 0, rejected = 0, pending = 0, total = 0 }) {
  const count = total > 0 ? total : (approved + rejected + pending);
  const appPct = count > 0 ? Math.round((approved / count) * 100) : 0;
  const rejPct = count > 0 ? Math.round((rejected / count) * 100) : 0;
  const penPct = count > 0 ? Math.round((pending / count) * 100) : 0;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const appStroke = (appPct / 100) * circumference;
  const rejStroke = (rejPct / 100) * circumference;
  const penStroke = (penPct / 100) * circumference;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#E7EAF0" strokeWidth="8" className="dark:stroke-[#243347]" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#16865C"
            strokeWidth="8"
            strokeDasharray={`${appStroke} ${circumference - appStroke}`}
            strokeDashoffset="0"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#D94B55"
            strokeWidth="8"
            strokeDasharray={`${rejStroke} ${circumference - rejStroke}`}
            strokeDashoffset={`-${appStroke}`}
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#C58B24"
            strokeWidth="8"
            strokeDasharray={`${penStroke} ${circumference - penStroke}`}
            strokeDashoffset={`-${appStroke + rejStroke}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-xl font-bold text-[#172033] dark:text-[#F2F4F7]">{appPct}%</span>
          <span className="block text-[10px] text-[#667085] dark:text-[#98A2B3] font-medium">Pass Rate</span>
        </div>
      </div>

      <div className="space-y-2.5 text-xs flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16865C]" />
            <span className="text-[#344054] dark:text-[#D0D5DD]">Approved</span>
          </div>
          <span className="text-[#172033] dark:text-[#F2F4F7] font-semibold">{approved} ({appPct}%)</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D94B55]" />
            <span className="text-[#344054] dark:text-[#D0D5DD]">Blocked / Rejected</span>
          </div>
          <span className="text-[#D94B55] font-semibold">{rejected} ({rejPct}%)</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C58B24]" />
            <span className="text-[#344054] dark:text-[#D0D5DD]">Awaiting Review</span>
          </div>
          <span className="text-[#C58B24] font-semibold">{pending} ({penPct}%)</span>
        </div>
      </div>
    </div>
  );
}
