// backend/src/utils/generatePrNumber.ts

export function generatePrNumber(latestPrNumber?: string): string {
  if (!latestPrNumber) {
    return "IT-001-PR";
  }

  const match = /^IT-(\d+)-PR$/.exec(latestPrNumber);

  if (!match) {
    throw new Error(`Invalid PR number: ${latestPrNumber}`);
  }

  const nextSequence = Number(match[1]) + 1;

  return `IT-${String(nextSequence).padStart(3, "0")}-PR`;
}