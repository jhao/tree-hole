
export interface Classification {
  emotion: '悲伤' | '高兴' | '中性';
  content_type: '事件' | '感情' | '心情' | '图片' | '工作' | '学习' | '生活' | '其他';
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string; // base64 data URL for display
  timestamp: number;
  classification?: Classification;
}

export interface TreeHole {
  id: string;
  name: string;
  passwordHash: string; // Storing password directly for simplicity in local-only app
  messages: Message[];
  position: { top: string; left: string; }; // For visual layout
  createdAt: number;
}
