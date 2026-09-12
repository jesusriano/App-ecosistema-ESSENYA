export const formatSafeDate = (dateVal?: any, fallback: string = 'No registrado'): string => {
  if (!dateVal) return fallback;
  try {
    if (typeof dateVal === 'string') {
      return dateVal.length > 10 ? dateVal.replace('T', ' ').substring(0, 19) : dateVal;
    }
    const d = typeof dateVal === 'object' && typeof dateVal?.toDate === 'function' 
      ? dateVal.toDate() 
      : (dateVal?.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal));
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch {
    // ignore
  }
  return String(dateVal);
};
