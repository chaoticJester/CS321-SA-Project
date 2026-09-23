import type { PrItemInput } from "../types/pr.js";

export function calculatePrTotal(items: PrItemInput[]): number {
    if (items.length === 0) {
        throw new Error("PR must contain at least one item");
    }

    const totalCents = items.reduce((sum, item) => {
        if (
            !Number.isInteger(item.qty) ||
            item.qty <= 0 ||
            !Number.isFinite(item.unit_price) ||
            item.unit_price < 0
        ) {
            throw new Error("Invalid PR item quantity or price");
        }

        const priceCents = Math.round(item.unit_price * 100);
        return sum + item.qty * priceCents;
    }, 0);

    if (!Number.isSafeInteger(totalCents)) {
        throw new Error("PR total exceeds supported range");
    }

    return totalCents / 100;
}