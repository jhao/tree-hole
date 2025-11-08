
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
