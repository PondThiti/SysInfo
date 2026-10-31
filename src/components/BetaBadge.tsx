import React from 'react';

export interface BetaBadgeProps {
  className?: string;
  title?: string;
}

export const BetaBadge: React.FC<BetaBadgeProps> = ({
  className = '',
  title = 'ฟีเจอร์นี้ยังทดลอง อาจมีบางหน้าแสดงผลไม่สมบูรณ์'
}) => {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 select-none cursor-help transition-colors ${className}`}
      title={title}
    >
      BETA
    </span>
  );
};

export default BetaBadge;
