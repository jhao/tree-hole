import type { Classification } from '../types';

// 预设的安慰、聆听和肯定的答复库
const comfortingPhrases: string[] = [
  "嗯嗯，我听着呢。",
  "别担心，我在这里陪着你。",
  "这样啊，听起来这一定很不容易。",
  "没关系，把你想说的都说出来吧。",
  "我理解你的感受。",
  "谢谢你愿意告诉我这些。",
  "这一定让你感觉很复杂吧。",
  "无论发生什么，感受自己的情绪都是可以的。",
  "给你一个温暖的拥抱。",
  "你已经做得很好了。",
  "慢慢来，不着急。"
];

// 新增：问候语关键词和回复
const greetingKeywords = ['你好', 'hi', 'hello', '在吗', '你好呀', 'hey'];
const greetingResponses = ['你好呀！', '嗯嗯，我在。', 'Hello!', '随时都在听你说。', '嗨！有什么想和我说的吗？'];


// 用于分类的关键词
const emotionKeywords = {
  '悲伤': ['难过', '伤心', '哭', '不开心', '痛苦', '郁闷', '烦', '唉', '失望'],
  '高兴': ['开心', '高兴', '快乐', '哈哈', '嘻嘻', '太棒了', '好棒', '幸福', '幸运'],
};

const contentTypeKeywords = {
  '工作': ['工作', '上班', '同事', '老板', '公司', '项目', '加班', '职业'],
  '学习': ['学习', '考试', '作业', '同学', '老师', '学校', '课程', '论文'],
  '感情': ['喜欢', '爱', '男朋友', '女朋友', '分手', '关系', '暗恋', '约会', 'ta'],
  '生活': ['生活', '日常', '今天', '明天', '事情', '最近', '东西', '吃饭'],
  '事件': ['发生', '遇到', '经历', '然后', '后来', '结果'],
  '心情': ['感觉', '觉得', '心情', '情绪'],
};


/**
 * 从预设库中随机获取一条安慰性的回复。
 * @param text - 用户输入的文本。
 * @param _image - 用户上传的图片（当前未使用，为保持接口一致性）。
 * @returns 一个包含安慰话语或问候的Promise。
 */
export const getComfortingReply = async (text: string, _image?: any): Promise<string> => {
  const lowerCaseText = text.trim().toLowerCase();

  // 检查是否为问候语
  if (greetingKeywords.some(keyword => lowerCaseText.includes(keyword))) {
    const randomIndex = Math.floor(Math.random() * greetingResponses.length);
    return Promise.resolve(greetingResponses[randomIndex]);
  }

  // 否则，返回一条安慰性回复
  const randomIndex = Math.floor(Math.random() * comfortingPhrases.length);
  return Promise.resolve(comfortingPhrases[randomIndex]);
};

/**
 * 在本地通过关键词分析消息内容。
 * @param text - 用户输入的文本。
 * @param image - 用户是否上传了图片。
 * @returns 一个包含分类结果的Promise。
 */
export const analyzeMessage = async (text: string, image?: any): Promise<Classification> => {
  const lowerCaseText = text.toLowerCase();
  
  // 默认分类
  let emotion: Classification['emotion'] = '中性';
  let contentType: Classification['content_type'] = '其他';

  // 1. 图片优先分类
  if (image) {
    contentType = '图片';
  }

  // 2. 情绪分类
  for (const [emo, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some(keyword => lowerCaseText.includes(keyword))) {
      emotion = emo as Classification['emotion'];
      break; 
    }
  }

  // 3. 内容分类 (如果不是图片)
  if (contentType !== '图片') {
     for (const [type, keywords] of Object.entries(contentTypeKeywords)) {
      if (keywords.some(keyword => lowerCaseText.includes(keyword))) {
        contentType = type as Classification['content_type'];
        break;
      }
    }
  }
 
  // 如果内容是图片但没有文本，情绪更可能是中性
  if (contentType === '图片' && !text.trim()) {
      emotion = '中性';
  }
  // 如果文本只是表达心情，但没有匹配到其他内容，则归类为心情
  else if (contentType === '其他' && emotion !== '中性' && text.length < 20) {
      contentType = '心情';
  }

  return Promise.resolve({
    emotion: emotion,
    content_type: contentType,
  });
};