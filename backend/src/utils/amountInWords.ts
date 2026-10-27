// Spell out a THB amount, e.g. 57000 -> "ห้าหมื่นเจ็ดพันบาทถ้วน" / "Fifty-seven thousand baht only".
// Amounts are rounded to whole satang first, so floating point noise never shows up.

function toSatang(amount: number): { baht: number; satang: number } {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`Invalid amount: ${amount}`);
  }
  const total = Math.round(amount * 100);
  return { baht: Math.floor(total / 100), satang: total % 100 };
}

// ---------- Thai ----------

const THAI_DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

// Read a number below one million. `hasHigherDigits` tells whether digits come
// before this group (e.g. the "ล้าน" part), which affects the "เอ็ด" rule.
function thaiBelowMillion(n: number, hasHigherDigits: boolean): string {
  const digits = String(n).split("").map(Number);
  let text = "";

  digits.forEach((digit, i) => {
    const place = digits.length - 1 - i;
    if (digit === 0) return;

    if (place === 1 && digit === 1) {
      text += "สิบ"; // 10-19 -> "สิบ", not "หนึ่งสิบ"
    } else if (place === 1 && digit === 2) {
      text += "ยี่สิบ";
    } else if (place === 0 && digit === 1 && (digits.length > 1 || hasHigherDigits)) {
      text += "เอ็ด"; // 11 -> "สิบเอ็ด", 101 -> "หนึ่งร้อยเอ็ด"
    } else {
      text += THAI_DIGITS[digit] + THAI_PLACES[place];
    }
  });

  return text;
}

function thaiNumber(n: number): string {
  if (n === 0) return "ศูนย์";
  if (n < 1_000_000) return thaiBelowMillion(n, false);

  const millions = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  return thaiNumber(millions) + "ล้าน" + (rest ? thaiBelowMillion(rest, true) : "");
}

export function thaiBahtText(amount: number): string {
  const { baht, satang } = toSatang(amount);
  if (satang === 0) return `${thaiNumber(baht)}บาทถ้วน`;
  if (baht === 0) return `${thaiNumber(satang)}สตางค์`;
  return `${thaiNumber(baht)}บาท${thaiNumber(satang)}สตางค์`;
}

// ---------- English ----------

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES = ["", "thousand", "million", "billion", "trillion"];

function englishBelowThousand(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest >= 20) {
    const unit = rest % 10;
    parts.push(unit ? `${TENS[Math.floor(rest / 10)]}-${ONES[unit]}` : TENS[Math.floor(rest / 10)]!);
  } else if (rest > 0) {
    parts.push(ONES[rest]!);
  }
  return parts.join(" ");
}

function englishNumber(n: number): string {
  if (n === 0) return "zero";

  const groups: string[] = [];
  let scale = 0;
  while (n > 0) {
    const group = n % 1000;
    if (group) {
      const scaleWord = SCALES[scale] ?? "";
      groups.unshift(englishBelowThousand(group) + (scaleWord ? ` ${scaleWord}` : ""));
    }
    n = Math.floor(n / 1000);
    scale++;
  }
  return groups.join(" ");
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function englishBahtText(amount: number): string {
  const { baht, satang } = toSatang(amount);
  if (satang === 0) return capitalize(`${englishNumber(baht)} baht only`);
  if (baht === 0) return capitalize(`${englishNumber(satang)} satang only`);
  return capitalize(`${englishNumber(baht)} baht and ${englishNumber(satang)} satang only`);
}
