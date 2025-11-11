
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Message, Classification, TreeHole } from './types';
import { getComfortingReply, analyzeMessage } from './services/aiService';
import { TREE_HOLES_DATA_KEY, MAX_STORAGE_BYTES, STORAGE_WARNING_THRESHOLD } from './constants';
import { Message as MessageComponent } from './components/Message';
import { ChatInput } from './components/ChatInput';
import { StorageIndicator } from './components/StorageIndicator';
import { UpgradeModal } from './components/UpgradeModal';
import { ArrowLeftIcon, HistoryIcon, TrashIcon, LockIcon } from './components/icons';
import { PasswordScreen } from './components/PasswordScreen';

// --- Pre-defined positions for the tree holes ---
const initialHolePositions = [
  { top: '15%', left: '50%' }, { top: '25%', left: '30%' }, { top: '28%', left: '70%' },
  { top: '40%', left: '45%' }, { top: '50%', left: '65%' }, { top: '62%', left: '35%' },
  { top: '75%', left: '55%' }, { top: '88%', left: '40%' }, { top: '105%', left: '60%' },
  { top: '120%', left: '30%' }, { top: '135%', left: '50%' }, { top: '150%', left: '70%'}
];

// --- Helper Functions ---
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


// --- Main App Component ---
export default function App() {
  const [treeHoles, setTreeHoles] = useState<TreeHole[]>([]);
  const [activeHoleId, setActiveHoleId] = useState<string | null>(null);

  // Auth flow states
  const [authHole, setAuthHole] = useState<TreeHole | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'setup' | null>(null);
  const [passwordError, setPasswordError] = useState('');

  const [trunkHeight, setTrunkHeight] = useState('250vh');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Load data from local storage on mount
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(TREE_HOLES_DATA_KEY);
      if (storedData) {
        setTreeHoles(JSON.parse(storedData));
      } else {
        // Initialize with default locked holes
        const initialHoles = initialHolePositions.map((pos, index) => ({
          id: `hole-${index}`,
          name: '',
          passwordHash: '',
          messages: [],
          position: pos,
          createdAt: 0
        }));
        setTreeHoles(initialHoles);
      }
    } catch (error) {
      console.error("Failed to load or initialize tree holes:", error);
    }
  }, []);

  // Effect to dynamically calculate trunk height to fit all content
  useEffect(() => {
    if (!activeHoleId) {
      const calculateHeight = () => {
        if (scrollContainerRef.current) {
          const height = scrollContainerRef.current.scrollHeight;
          setTrunkHeight(`${height}px`);
        }
      };
      
      // Calculate height after a short delay to ensure DOM is fully rendered
      const timer = setTimeout(calculateHeight, 50);
      window.addEventListener('resize', calculateHeight);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', calculateHeight);
      };
    }
  }, [activeHoleId]);

  const saveTreeHoles = (updatedHoles: TreeHole[]) => {
    setTreeHoles(updatedHoles);
    localStorage.setItem(TREE_HOLES_DATA_KEY, JSON.stringify(updatedHoles));
  };

  const handleHoleClick = (hole: TreeHole) => {
    setAuthHole(hole);
    if (hole.passwordHash) {
      setAuthMode('login');
    } else {
      setAuthMode('setup');
    }
    setPasswordError('');
  };

  const handlePasswordSubmit = (password: string) => {
    if (!authHole) return;

    if (authMode === 'setup') {
      const updatedHoles = treeHoles.map(h =>
        h.id === authHole.id ? { ...h, passwordHash: password, createdAt: Date.now() } : h
      );
      saveTreeHoles(updatedHoles);
      setActiveHoleId(authHole.id);
      setAuthMode(null);
      setAuthHole(null);
    } else if (authMode === 'login') {
      if (password === authHole.passwordHash) {
        setActiveHoleId(authHole.id);
        setAuthMode(null);
        setAuthHole(null);
      } else {
        setPasswordError('密码错误，请重试。');
      }
    }
  };

  const activeHole = useMemo(() => treeHoles.find(h => h.id === activeHoleId), [treeHoles, activeHoleId]);

  if (!activeHoleId) {
    return (
      <div ref={scrollContainerRef} className="relative w-full min-h-screen overflow-y-auto bg-gray-100 dark:bg-gray-800 flex justify-center font-sans">
        {authMode && authHole && (
          <PasswordScreen
            mode={authMode}
            onSubmit={handlePasswordSubmit}
            onClose={() => setAuthMode(null)}
            error={passwordError}
          />
        )}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-72 sm:w-96 bg-[#5C3A21] rounded-b-lg shadow-2xl"
          style={{ height: trunkHeight }}
        ></div>
        <div className="relative z-10 w-full max-w-2xl h-[200vh] py-16">
          <div className="text-center mb-16 sticky top-8 z-20">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">树洞之树</h1>
            <p className="text-white/80 mt-2">选择一个树洞，开始你的诉说</p>
          </div>
          {treeHoles.map(hole => (
            <div key={hole.id} style={{
              position: 'absolute',
              top: hole.position.top,
              left: hole.position.left,
              transform: 'translateX(-50%)',
            }} className="flex flex-col items-center group">
              <button
                onClick={() => handleHoleClick(hole)}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110
                  ${hole.passwordHash
                    ? 'bg-yellow-400/30 border-2 border-yellow-500' 
                    : 'bg-black/50 border-2 border-gray-500 text-gray-300'
                  }`}
              >
                {hole.passwordHash ? (
                  <div className="w-8 h-8 rounded-full bg-yellow-500 animate-pulse"></div>
                ) : (
                  <LockIcon />
                )}
              </button>
              {hole.name && <span className="mt-2 text-xs text-white bg-black/30 px-2 py-0.5 rounded-full">{hole.name}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <ActiveHoleView
      hole={activeHole!}
      onExit={() => setActiveHoleId(null)}
      onUpdateHole={(updatedHole) => {
        const updatedHoles = treeHoles.map(h => h.id === updatedHole.id ? updatedHole : h);
        saveTreeHoles(updatedHoles);
      }}
    />
  );
}


// --- Active Hole View Component (Chat, History, etc.) ---
interface ActiveHoleViewProps {
  hole: TreeHole;
  onExit: () => void;
  onUpdateHole: (updatedHole: TreeHole) => void;
}

const ActiveHoleView: React.FC<ActiveHoleViewProps> = ({ hole, onExit, onUpdateHole }) => {
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [storageUsage, setStorageUsage] = useState(0);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [emotionFilter, setEmotionFilter] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState(hole.name);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const calculateStorageUsage = useCallback(() => {
     try {
      const storedData = localStorage.getItem(TREE_HOLES_DATA_KEY);
      if (storedData) {
        const bytes = new Blob([storedData]).size;
        const percentage = bytes / MAX_STORAGE_BYTES;
        setStorageUsage(percentage);
        if (percentage > STORAGE_WARNING_THRESHOLD) {
          setIsUpgradeModalOpen(true);
        }
      }
    } catch (e) {
      console.error("Could not calculate storage usage:", e);
    }
  }, []);

  useEffect(() => {
    calculateStorageUsage();
  }, [hole.messages, calculateStorageUsage]);

  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [hole.messages, view]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.value.length <= 10) {
          setEditingName(e.target.value);
      }
  }

  const handleNameBlur = () => {
      onUpdateHole({ ...hole, name: editingName });
  }
  
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if(e.key === 'Enter') {
        nameInputRef.current?.blur();
      }
  }

  const handleSendMessage = async (text: string, imageFile?: File) => {
    setIsLoading(true);
    let imagePayload, imageDisplayUrl;
    if (imageFile) {
      try {
        const { displayUrl } = await fileToBase64(imageFile);
        imagePayload = { present: true };
        imageDisplayUrl = displayUrl;
      } catch (error) {
        console.error("Error processing image:", error);
        setIsLoading(false);
        return;
      }
    }
    const userMessage: Message = { id: `user-${Date.now()}`, sender: 'user', text: text, imageUrl: imageDisplayUrl, timestamp: Date.now() };
    const updatedMessages = [...hole.messages, userMessage];
    onUpdateHole({ ...hole, messages: updatedMessages });
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const [replyText, classification] = await Promise.all([ getComfortingReply(text, imagePayload), analyzeMessage(text, imagePayload) ]);
      const aiMessage: Message = { id: `ai-${Date.now()}`, sender: 'ai', text: replyText, timestamp: Date.now() };
      const finalMessages = updatedMessages.map(msg => msg.id === userMessage.id ? { ...msg, classification } : msg);
      onUpdateHole({ ...hole, messages: [...finalMessages, aiMessage] });
    } catch (error) {
      console.error("Error with local AI service:", error);
      const errorMessage: Message = { id: `ai-error-${Date.now()}`, sender: 'ai', text: "抱歉，我好像走神了。你能再说一遍吗？", timestamp: Date.now() };
      onUpdateHole({ ...hole, messages: [...updatedMessages, errorMessage] });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteSelected = () => {
    const newMessages = hole.messages.filter(msg => !selectedMessageIds.has(msg.id));
    onUpdateHole({ ...hole, messages: newMessages });
    setSelectedMessageIds(new Set());
  };

  const handleToggleSelection = (messageId: string) => {
    setSelectedMessageIds(prev => {
      const newSet = new Set(prev);
      newSet.has(messageId) ? newSet.delete(messageId) : newSet.add(messageId);
      return newSet;
    });
  };

  const filteredMessages = useMemo(() => {
    return hole.messages.filter(msg => {
      if (msg.sender === 'ai') return false;
      const textMatch = !searchTerm || (msg.text && msg.text.toLowerCase().includes(searchTerm.toLowerCase()));
      const emotionMatch = emotionFilter === 'all' || msg.classification?.emotion === emotionFilter;
      const contentMatch = contentTypeFilter === 'all' || msg.classification?.content_type === contentTypeFilter;
      return textMatch && emotionMatch && contentMatch;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [hole.messages, searchTerm, emotionFilter, contentTypeFilter]);

  const handleSelectAll = () => {
    if(selectedMessageIds.size === filteredMessages.length) {
        setSelectedMessageIds(new Set());
    } else {
        setSelectedMessageIds(new Set(filteredMessages.map(m => m.id)));
    }
  };
  
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
  
  const renderChatView = () => (
    <div className="flex flex-col h-screen font-sans antialiased text-gray-800 dark:text-gray-200">
      <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center">
        <button onClick={onExit} className="p-2 -ml-2 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" title="返回树洞之树"><ArrowLeftIcon /></button>
        <input
            ref={nameInputRef}
            type="text"
            value={editingName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            placeholder="为这个树洞起个名字"
            className="text-center text-xl font-semibold text-gray-700 dark:text-gray-200 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-md"
        />
        <button onClick={() => setView('history')} className="p-2 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400" title="查看历史记录"><HistoryIcon /></button>
      </header>
      <main className="flex-grow p-4 overflow-y-auto bg-gray-100 dark:bg-gray-900 flex flex-col">
        {hole.messages.map((msg) => <MessageComponent key={msg.id} message={msg} />)}
        {isLoading && <div className="flex items-start mb-4"><div className="max-w-xs md:max-w-md p-3 rounded-lg shadow-md bg-white dark:bg-gray-700 self-start rounded-r-lg rounded-tl-lg"><div className="flex items-center space-x-2"><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div></div></div></div>}
        <div ref={messagesEndRef} />
      </main>
      <footer className="sticky bottom-0">
        <StorageIndicator usagePercentage={storageUsage} onClick={() => setIsUpgradeModalOpen(true)} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>
      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
    </div>
  );

  const renderHistoryView = () => (
    <div className="flex flex-col h-screen font-sans bg-gray-100 dark:bg-gray-900">
       <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => setView('chat')} className="p-2 -ml-2 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400"><ArrowLeftIcon /></button>
        <h1 className="flex-1 text-xl font-semibold text-gray-700 dark:text-gray-200">聊天记录: {hole.name || '未命名'}</h1>
      </header>
      <div className="p-4 space-y-4 sticky top-[73px] bg-gray-100 dark:bg-gray-900 z-10 border-b dark:border-gray-700">
        <input type="text" placeholder="搜索..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex flex-col sm:flex-row gap-4">
            <select value={emotionFilter} onChange={e => setEmotionFilter(e.target.value)} className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="all">所有情绪</option><option value="高兴">高兴</option><option value="悲伤">悲伤</option><option value="中性">中性</option></select>
            <select value={contentTypeFilter} onChange={e => setContentTypeFilter(e.target.value)} className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="all">所有类型</option><option value="事件">事件</option><option value="感情">感情</option><option value="心情">心情</option><option value="图片">图片</option><option value="工作">工作</option><option value="学习">学习</option><option value="生活">生活</option><option value="其他">其他</option></select>
        </div>
      </div>
      <main className="flex-grow p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4 px-2">
            <div className="flex items-center"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" onChange={handleSelectAll} checked={filteredMessages.length > 0 && selectedMessageIds.size === filteredMessages.length} aria-label="全选"/><label className="ml-2 text-sm text-gray-600 dark:text-gray-300">全选</label></div>
            <span className="text-sm text-gray-500">{filteredMessages.length} 条记录</span>
        </div>
        {filteredMessages.length === 0 ? <div className="text-center py-16 text-gray-500"><p>没有找到匹配的记录</p></div> : <ul className="space-y-3">{filteredMessages.map(msg => (<li key={msg.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm flex items-start gap-3"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1" checked={selectedMessageIds.has(msg.id)} onChange={() => handleToggleSelection(msg.id)} aria-labelledby={`message-text-${msg.id}`}/><div className="flex-1">{msg.imageUrl && <img src={msg.imageUrl} alt="用户上传的图片" className="max-w-full sm:max-w-xs rounded-md mb-2" />}<p id={`message-text-${msg.id}`} className="text-sm text-gray-800 dark:text-gray-200" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>{getClassificationBadge(msg.classification)}<p className="text-xs text-gray-400 mt-2">{new Date(msg.timestamp).toLocaleString()}</p></div></li>))}</ul>}
      </main>
      {selectedMessageIds.size > 0 && <footer className="sticky bottom-0 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t dark:border-gray-700 flex justify-between items-center animate-fade-in-up"><span className="text-sm font-medium text-gray-700 dark:text-gray-200">已选择 {selectedMessageIds.size} 项</span><button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 flex items-center transition-colors"><TrashIcon />删除</button><style>{`@keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }`}</style></footer>}
    </div>
  );
  
  return view === 'history' ? renderHistoryView() : renderChatView();
};
