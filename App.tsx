
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Message } from './types';
import { getComfortingReply, analyzeMessage } from './services/geminiService';
import { LOCAL_STORAGE_KEY, MAX_STORAGE_BYTES, STORAGE_WARNING_THRESHOLD } from './constants';
import { Message as MessageComponent } from './components/Message';
import { ChatInput } from './components/ChatInput';
import { StorageIndicator } from './components/StorageIndicator';
import { UpgradeModal } from './components/UpgradeModal';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storageUsage, setStorageUsage] = useState(0);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const calculateStorageUsage = useCallback(() => {
    try {
      const storedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedMessages) {
        const bytes = new Blob([storedMessages]).size;
        const percentage = bytes / MAX_STORAGE_BYTES;
        setStorageUsage(percentage);
        if (percentage > STORAGE_WARNING_THRESHOLD) {
          setIsUpgradeModalOpen(true);
        }
      } else {
        setStorageUsage(0);
      }
    } catch (e) {
      console.error("Could not calculate storage usage:", e);
      setStorageUsage(1); // Assume full if error
    }
  }, []);

  useEffect(() => {
    const storedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
    calculateStorageUsage();
  }, [calculateStorageUsage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateMessages = (newMessages: Message[]) => {
    setMessages(newMessages);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newMessages));
    calculateStorageUsage();
  };

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

  return (
    <div className="flex flex-col h-screen font-sans antialiased text-gray-800 dark:text-gray-200">
      <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-200">心灵树洞</h1>
        <p className="text-sm text-gray-500">一个只属于你的，安静的角落</p>
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
}
