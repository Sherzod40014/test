/**
 * Computes cargo volume in cubic meters (CBM) from millimeter-free centimeter dimensions.
 */
export function calculateCbm(lengthCm: number, widthCm: number, heightCm: number): number {
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
    throw new Error('calculateCbm: lengthCm, widthCm and heightCm must all be greater than zero');
  }
  return (lengthCm * widthCm * heightCm) / 1_000_000;
}

/**
 * Formats a customer's permanent sequence number into their GS Code, e.g. 1 -> "GS001",
 * 42 -> "GS042", 450 -> "GS450", 1234 -> "GS1234".
 */
export function formatGsCode(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber <= 0) {
    throw new Error('formatGsCode: sequenceNumber must be a positive integer');
  }
  return `GS${String(sequenceNumber).padStart(3, '0')}`;
}
