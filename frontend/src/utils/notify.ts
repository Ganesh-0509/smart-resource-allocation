import { toast } from "react-hot-toast";

/**
 * Global notification utility for consistent styling and behavior.
 */
export const notify = {
  success: (message: string) => {
    toast.success(message, {
      icon: '✅',
      style: {
        border: '1px solid #1A3C2E',
        padding: '16px',
        color: '#1A3C2E',
        background: '#F0FDF4',
      },
    });
  },
  error: (message: string) => {
    toast.error(message, {
      icon: '❌',
      style: {
        border: '1px solid #991B1B',
        padding: '16px',
        color: '#991B1B',
        background: '#FEF2F2',
      },
    });
  },
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      style: {
        border: '1px solid #1E40AF',
        padding: '16px',
        color: '#1E40AF',
        background: '#EFF6FF',
      },
    });
  },
  loading: (message: string) => {
    return toast.loading(message, {
      style: {
        border: '1px solid #374151',
        padding: '16px',
        color: '#374151',
        background: '#F9FAFB',
      },
    });
  },
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  }
};
