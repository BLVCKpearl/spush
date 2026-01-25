// Currency utilities for Nigerian Naira (NGN)
// All amounts are stored as integers in kobo (1 NGN = 100 kobo)

/**
 * Format kobo amount to Naira display string
 * @param kobo - Amount in kobo (integer)
 * @returns Formatted string like "₦1,500.00"
 */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(naira);
}

/**
 * Convert Naira to kobo for storage
 * @param naira - Amount in Naira
 * @returns Amount in kobo (integer)
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Convert kobo to Naira for display
 * @param kobo - Amount in kobo
 * @returns Amount in Naira
 */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}
