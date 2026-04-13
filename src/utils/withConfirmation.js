import { MessageService } from '../services/MessageService';

/**
 * Wraps an async function with a confirmation dialog.
 */
export async function withConfirmation(action, options = {}) {
  const confirmed = await MessageService.confirm(
    options.message || 'Are you sure you want to perform this action?', 
    options
  );

  if (confirmed) {
    return await action();
  }

  return null;
}
