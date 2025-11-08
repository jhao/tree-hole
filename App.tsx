import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Message, Classification } from './types';
import { getComfortingReply, analyzeMessage } from './services/geminiService';
import { LOCAL_STORAGE_KEY, MAX_STORAGE_BYTES, STORAGE_WARNING_THRESHOLD } from './constants';
import { Message as MessageComponent } from './components/Message';
import { ChatInput } from './components/ChatInput';
import { StorageIndicator } from './components/StorageIndicator';
import { UpgradeModal } from './components/UpgradeModal';
import { ArrowLeftIcon, HistoryIcon, TrashIcon, TreeIcon } from './components/icons';

const fileToBase64 = (file: File): Promise<{ data: string, mimeType: string, displayUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];
      resolve({ data: base64Data, mimeType: file.type, displayUrl: dataUrl });
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function App() {
  const [view, setView] = useState<'landing' | 'chat' | 'history'>('landing');
  const [isExitingLanding, setIsExitingLanding] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storageUsage, setStorageUsage] = useState(0);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [emotionFilter, setEmotionFilter] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const calculateStorageUsage = useCallback(() => {
    try {
      const storedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedMessages) {
        const bytes = new Blob([storedMessages]).size;
        const percentage = bytes / MAX_STORAGE_BYTES;
        setStorageUsage(percentage);
        if (percentage > STORAGE_WARNING_THRESHOLD && !isUpgradeModalOpen) {
          setIsUpgradeModalOpen(true);
        }
      } else {
        setStorageUsage(0);
      }
    } catch (e) {
      console.error("Could not calculate storage usage:", e);
      setStorageUsage(1);
    }
  }, [isUpgradeModalOpen]);

  const updateMessages = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newMessages));
    calculateStorageUsage();
  }, [calculateStorageUsage]);

  useEffect(() => {
    const storedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
    calculateStorageUsage();
  }, [calculateStorageUsage]);

  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, view]);

  const handleSendMessage = async (text: string, imageFile?: File) => {
    setIsLoading(true);
  
    let imagePayload;
    let imageDisplayUrl;

    if (imageFile) {
        try {
            const { data, mimeType, displayUrl } = await fileToBase64(imageFile);
            imagePayload = { inlineData: { data, mimeType } };
            imageDisplayUrl = displayUrl;
        } catch (error) {
            console.error("Error processing image:", error);
            setIsLoading(false);
            return;
        }
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      imageUrl: imageDisplayUrl,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    updateMessages(updatedMessages);

    try {
      const [replyText, classification] = await Promise.all([
        getComfortingReply(text, imagePayload),
        analyzeMessage(text, imagePayload),
      ]);

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: Date.now(),
      };
      
      const finalMessages = updatedMessages.map(msg => 
        msg.id === userMessage.id ? { ...msg, classification } : msg
      );
      
      updateMessages([...finalMessages, aiMessage]);
      
    } catch (error) {
      console.error("Error communicating with AI:", error);
      const errorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        sender: 'ai',
        text: "抱歉，我好像走神了。你能再说一遍吗？",
        timestamp: Date.now(),
      };
      updateMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEnterApp = () => {
    setIsExitingLanding(true);
    setTimeout(() => {
      setView('chat');
    }, 500);
  };
  
  const handleDeleteSelected = () => {
    const newMessages = messages.filter(msg => !selectedMessageIds.has(msg.id));
    updateMessages(newMessages);
    setSelectedMessageIds(new Set());
  };

  const handleToggleSelection = (messageId: string) => {
    setSelectedMessageIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      if (msg.sender === 'ai') return false;
      const textMatch = !searchTerm || (msg.text && msg.text.toLowerCase().includes(searchTerm.toLowerCase()));
      const emotionMatch = emotionFilter === 'all' || msg.classification?.emotion === emotionFilter;
      const contentMatch = contentTypeFilter === 'all' || msg.classification?.content_type === contentTypeFilter;
      return textMatch && emotionMatch && contentMatch;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [messages, searchTerm, emotionFilter, contentTypeFilter]);

  const handleSelectAll = () => {
      if(selectedMessageIds.size === filteredMessages.length) {
          setSelectedMessageIds(new Set());
      } else {
          setSelectedMessageIds(new Set(filteredMessages.map(m => m.id)));
      }
  };

  const renderLandingPage = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-center p-4">
      <div className={`transition-opacity duration-500 ${isExitingLanding ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex justify-center mb-4">
          <TreeIcon />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mt-2">心灵树洞</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mt-2 mb-8">一个只属于你的，安静的角落</p>
        <button
          onClick={handleEnterApp}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
        >
          开启我的树洞
        </button>
      </div>
    </div>
  );

  const renderChatView = () => (
    <div className="flex flex-col h-screen font-sans antialiased text-gray-800 dark:text-gray-200">
      <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center">
        <div className="w-8"></div>
        <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-200">心灵树洞</h1>
            <p className="text-sm text-gray-500">一个只属于你的，安静的角落</p>
        </div>
        <button onClick={() => setView('history')} className="p-2 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" title="查看历史记录">
          <HistoryIcon />
        </button>
      </header>

      <main className="flex-grow p-4 overflow-y-auto bg-gray-100 dark:bg-gray-900 flex flex-col">
        {messages.map((msg) => (
          <MessageComponent key={msg.id} message={msg} />
        ))}
        {isLoading && (
           <div className="flex items-start mb-4">
              <div className="max-w-xs md:max-w-md p-3 rounded-lg shadow-md bg-white dark:bg-gray-700 self-start rounded-r-lg rounded-tl-lg">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                </div>
            </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="sticky bottom-0">
        <StorageIndicator usagePercentage={storageUsage} onClick={() => setIsUpgradeModalOpen(true)} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>

      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
    </div>
  );
  
  const getClassificationBadge = (classification?: Classification) => {
    if (!classification) return null;
    const { emotion, content_type } = classification;
    const emotionColor = emotion === '高兴' ? 'bg-yellow-200 text-yellow-800' : emotion === '悲伤' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800';
    const contentColor = 'bg-indigo-200 text-indigo-800';
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${emotionColor}`}>{emotion}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${contentColor}`}>{content_type}</span>
        </div>
    );
  };

  const renderHistoryView = () => (
    <div className="flex flex-col h-screen font-sans bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => setView('chat')} className="p-2 -ml-2 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400">
          <ArrowLeftIcon />
        </button>
        <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-200">聊天记录</h1>
      </header>

      <div className="p-4 space-y-4 sticky top-[73px] bg-gray-100 dark:bg-gray-900 z-10 border-b dark:border-gray-700">
        <input
            type="text"
            placeholder="搜索..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex flex-col sm:flex-row gap-4">
            <select value={emotionFilter} onChange={e => setEmotionFilter(e.target.value)} className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">所有情绪</option>
                <option value="高兴">高兴</option>
                <option value="悲伤">悲伤</option>
                <option value="中性">中性</option>
            </select>
            <select value={contentTypeFilter} onChange={e => setContentTypeFilter(e.target.value)} className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">所有类型</option>
                <option value="事件">事件</option>
                <option value="感情">感情</option>
                <option value="心情">心情</option>
                <option value="图片">图片</option>
                <option value="工作">工作</option>
                <option value="学习">学习</option>
                <option value="生活">生活</option>
                <option value="其他">其他</option>
            </select>
        </div>
      </div>
      
      <main className="flex-grow p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4 px-2">
            <div className="flex items-center">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onChange={handleSelectAll}
                    checked={filteredMessages.length > 0 && selectedMessageIds.size === filteredMessages.length}
                    aria-label="全选"
                />
                <label className="ml-2 text-sm text-gray-600 dark:text-gray-300">全选</label>
            </div>
            <span className="text-sm text-gray-500">{filteredMessages.length} 条记录</span>
        </div>
        
        {filteredMessages.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
                <p>没有找到匹配的记录</p>
            </div>
        ) : (
            <ul className="space-y-3">
                {filteredMessages.map(msg => (
                    <li key={msg.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm flex items-start gap-3">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                            checked={selectedMessageIds.has(msg.id)}
                            onChange={() => handleToggleSelection(msg.id)}
                            aria-labelledby={`message-text-${msg.id}`}
                        />
                        <div className="flex-1">
                            {msg.imageUrl && <img src={msg.imageUrl} alt="用户上传的图片" className="max-w-full sm:max-w-xs rounded-md mb-2" />}
                            <p id={`message-text-${msg.id}`} className="text-sm text-gray-800 dark:text-gray-200" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            {getClassificationBadge(msg.classification)}
                            <p className="text-xs text-gray-400 mt-2">{new Date(msg.timestamp).toLocaleString()}</p>
                        </div>
                    </li>
                ))}
            </ul>
        )}
      </main>

      {selectedMessageIds.size > 0 && (
          <footer className="sticky bottom-0 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t dark:border-gray-700 flex justify-between items-center animate-fade-in-up">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">已选择 {selectedMessageIds.size} 项</span>
              <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 flex items-center transition-colors"
              >
                  <TrashIcon />
                  删除
              </button>
               <style>{`
                @keyframes fade-in-up {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
              `}</style>
          </footer>
      )}
    </div>
  );

  switch(view) {
    case 'landing':
      return renderLandingPage();
    case 'history':
      return renderHistoryView();
    case 'chat':
    default:
      return renderChatView();
  }
}
