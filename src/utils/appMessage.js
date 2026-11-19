import { message as antdMessage } from 'antd';
import { translateToastMessage } from '../services/notification/ToastProvider';

const formatContent = (content) => {
  if (typeof content === 'string') {
    return translateToastMessage(content);
  }
  if (content && typeof content === 'object' && content.content && typeof content.content === 'string') {
    return {
      ...content,
      content: translateToastMessage(content.content)
    };
  }
  return content;
};

export const appMessage = {
  success: (content, duration, onClose) => antdMessage.success(formatContent(content), duration, onClose),
  error: (content, duration, onClose) => antdMessage.error(formatContent(content), duration, onClose),
  warning: (content, duration, onClose) => antdMessage.warning(formatContent(content), duration, onClose),
  info: (content, duration, onClose) => antdMessage.info(formatContent(content), duration, onClose),
  loading: (content, duration, onClose) => antdMessage.loading(formatContent(content), duration, onClose),
  open: (config) => antdMessage.open(formatContent(config)),
  destroy: () => antdMessage.destroy()
};

export default appMessage;
