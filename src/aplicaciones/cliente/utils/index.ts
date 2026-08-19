/**
 * Utilidades exclusivas para la aplicación del Cliente ESSENYA
 */

export const formatCurrency = (amount: number): string => {
  return `$${(amount ?? 0).toLocaleString()} MXN`;
};

export const formatBookingCode = (codeOrId: string): string => {
  if (!codeOrId) return 'R-0000';
  return codeOrId.startsWith('#') ? codeOrId : `#${codeOrId}`;
};

export const getDiscountedPrice = (price: number, discountPercent: number): number => {
  if (!price || price <= 0) return 0;
  return Math.round(price * (1 - (discountPercent / 100)));
};
