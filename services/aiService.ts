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
  "慢慢来，不着急。",
  "我明白，这听起来确实很难。",
  "深呼吸，一切都会好起来的。",
  "你不是一个人在面对这些。",
  "能和我说说，是你的信任。",
  "不管怎么样，你的感受都是真实且重要的。",
  "请允许自己有难过的时间。",
  "这真的很难，你已经很坚强了。",
  "继续说，我一直在听。",
  "听起来你承受了很多。",
  "想哭就哭出来吧，没关系的。",
  "有时候，只是存在着，就已经是一种胜利。",
  "拍拍你的背。",
  "你可以把这里当成一个安全的港湾。",
  "无论你说什么，我都会在这里。",
  "这听起来让人心疼。",
  "你的感受是完全合理的。",
  "别对自己太苛刻了。",
  "我知道这不容易，但你正在努力。",
  "如果需要，随时都可以找我。",
  "一步一步来，我们不赶时间。",
  "这一定让你很疲惫吧。",
  "感受这种情绪需要很大的勇气。",
  "谢谢你，让我知道你的心事。",
  "我相信你有力量度过这一切。",
  "记住，照顾好自己是第一位的。",
  "这听起来像是一段很艰难的经历。",
  "我能感觉到你话语里的重量。",
  "没关系，情绪来的时候就让它来。",
  "我会一直在这里，默默地支持你。",
  "你正在经历的，不是小事。",
  "请给自己一些空间和时间。",
  "这真的不怪你。",
  "我能想象这有多么令人沮丧。",
  "你比你想象的要更强大。",
  "让情绪自然地流淌，不要压抑它。",
  "这确实很不公平。",
  "此刻，你的感受最重要。",
  "我在这里，为你提供一个安静的角落。",
  "听起来你真的尽力了。",
  "辛苦了，真的辛苦了。",
  "我知道，有时候语言很苍白，但我真的在听。",
  "允许自己脆弱，这是一种力量。",
  "如果可以，试着对自己温柔一点。",
  "这件事听起来让你很受伤。",
  "我能感觉到你的挣扎。",
  "没关系，我们都有这样的时候。",
  "这种感觉，一定很难受吧。",
  "你所说的，我都记在心里。",
  "只是把这些说出来，本身就是一步。",
  "我能理解为什么你会这么想。",
  "你的想法和感受，都值得被尊重。",
  "这不是你的错。",
  "感觉被掏空了吧，好好休息一下。",
  "我能从你的话里感受到那种无力感。",
  "放心，你的秘密在这里是安全的。",
  "我希望你能感觉到一丝温暖。",
  "即使全世界都不理解，我在这里听你。",
  "慢慢说，把思绪理一理。",
  "这听起来确实让人很生气。",
  "你完全有权利感到愤怒/悲伤/失望。",
  "我知道这很难接受。",
  "让我们一起面对这个情绪吧。",
  "你不需要独自承担这一切。",
  "这一定像一块大石头压在你心上。",
  "我能感觉到你的迷茫。",
  "没事的，有情绪是很正常的。",
  "你的感受很重要，不要忽视它。",
  "你描述的画面，我仿佛能看到。",
  "谢谢你如此坦诚。",
  "不管结果如何，你都付出了努力。",
  "这听起来像一个很沉重的负担。",
  "我能理解你的担忧。",
  "你不需要总是那么坚强。",
  "我能体会到你的失望。",
  "这件事让你很困扰吧。",
  "我会陪你度过这段时间的。",
  "你的感受值得被认真对待。",
  "我能感觉到你的疲惫和无奈。",
  "没关系，就把我当成一个情绪的垃圾桶吧。",
  "我能想象你当时的心情。",
  "你真的很勇敢，愿意面对这些。",
  "我在这里，给你力量。",
  "这听起来让人很心碎。",
  "我能感觉到你的委屈。",
  "没关系，在这里你可以做最真实的自己。",
  "我能理解这让你有多纠结。",
  "我会静静地听你把话说完。",
  "这听起来很复杂，也一定很累心。",
  "我能感觉到你内心的矛盾。",
  "你已经承受了太多本不该你承受的东西。",
  "我在这里，给你一个可以喘息的空间。"
];

// 新增：问候语关键词和回复
const greetingKeywords = [
    '你好', 'hi', 'hello', '在吗', '你好呀', 'hey', '嗨', '哈喽', 
    '早上好', '中午好', '下午好', '晚上好', 'good morning', 
    'good afternoon', 'good evening', 'yo', "what's up", 
    'how are you', '有人吗', '吃了么'
];
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