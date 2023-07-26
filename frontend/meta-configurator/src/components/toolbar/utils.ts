import Toast from 'primevue/toast';

// Utility function to show the toast message
export function showToast(severity, summary, detail, life) {
  const toast = new Toast();
  toast.add({severity, summary, detail, life});
}
