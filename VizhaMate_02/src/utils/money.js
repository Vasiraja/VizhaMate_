export function parseRupees(value) {
    const text = String(value ?? '').trim();
    if (!/^[0-9]+$/.test(text)) return null;
    const rupees = Number(text);
    if (!Number.isSafeInteger(rupees) || rupees <= 0 || rupees > Math.floor(Number.MAX_SAFE_INTEGER / 100)) return null;
    return rupees * 100;
}

export function formatRupees(paise = 0) {
    const rupees = Math.floor(Number(paise) / 100);
    return `₹${new Intl.NumberFormat('en-IN').format(rupees)}`;
}

export function totalPaise(transactions) {
    return transactions.reduce((total, transaction) => (
        transaction.status === 'valid' ? total + transaction.amount_paise : total
    ), 0);
}