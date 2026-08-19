import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      className={`animate-pulse bg-[#EFEAE1] dark:bg-[#222222] rounded-xl relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#141414]/70 border border-[#E5DFD3] dark:border-[#262626] space-y-4">
      <div className="flex items-center space-x-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
    </div>
  );
};

export const SkeletonMetric: React.FC = () => {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#141414] border border-[#E5DFD3] dark:border-[#262626] space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
};
