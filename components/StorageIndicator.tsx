
import React from 'react';

interface StorageIndicatorProps {
  usagePercentage: number;
  onClick: () => void;
}

export const StorageIndicator: React.FC<StorageIndicatorProps> = ({ usagePercentage, onClick }) => {
  const displayPercentage = Math.round(usagePercentage * 100);
  const color = displayPercentage > 90 ? 'bg-red-500' : displayPercentage > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div 
      className="p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer" 
      onClick={onClick}
      title="点击查看存储详情"
    >
      <div className="flex justify-between items-center mb-1 text-sm text-gray-600 dark:text-gray-300">
        <span>本地存储空间</span>
        <span>{displayPercentage}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div 
          className={`${color} h-2.5 rounded-full transition-all duration-500 ease-out`} 
          style={{ width: `${displayPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};
