
import React from 'react';
import { CloseIcon } from './icons';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const dbOptions = [
  { name: 'Firebase Firestore', description: 'Google提供的实时NoSQL数据库，易于集成和扩展。' },
  { name: 'Supabase', description: '开源的Firebase替代品，提供PostgreSQL数据库和自动生成的API。' },
  { name: 'AWS DynamoDB', description: '亚马逊提供的完全托管的NoSQL数据库，具有高可用性和可扩展性。' },
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 md:p-8 m-4 max-w-lg w-full transform transition-all duration-300 scale-95 animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">升级您的存储</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
            <CloseIcon />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          您的本地存储空间即将用尽。升级到云存储，以安全地保存您的所有记录，并在任何设备上访问它们。
        </p>

        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">推荐的云数据库选项：</h3>
          {dbOptions.map(option => (
            <div key={option.name} className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <p className="font-semibold text-blue-600 dark:text-blue-400">{option.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              以后再说
            </button>
            <button
              className="w-full sm:w-auto px-6 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md"
            >
              登录并开始升级
            </button>
        </div>
      </div>
       <style>{`
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.3s ease-out forwards;
          }
        `}</style>
    </div>
  );
};
