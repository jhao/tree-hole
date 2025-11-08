
import React from 'react';
import type { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const bubbleClasses = isUser
    ? 'bg-blue-500 text-white self-end rounded-l-lg rounded-tr-lg'
    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 self-start rounded-r-lg rounded-tl-lg';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4 animate-fade-in`}>
      <div className={`max-w-xs md:max-w-md p-3 rounded-lg shadow-md ${bubbleClasses}`}>
        {message.imageUrl && (
          <img src={message.imageUrl} alt="User upload" className="rounded-lg mb-2 max-h-60" />
        )}
        <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{message.text}</p>
      </div>
      <span className="text-xs text-gray-400 mt-1 px-1">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        `}</style>
    </div>
  );
};
