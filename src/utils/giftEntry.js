import { rupeesToPaise } from './money.js'

export const DENOMINATIONS = [
    { key: 'coin-1', label: '₹1 coin', amountPaise: 100 },
    { key: 'coin-2', label: '₹2 coin', amountPaise: 200 },
    { key: 'coin-5', label: '₹5 coin', amountPaise: 500 },
    { key: 'coin-10', label: '₹10 coin', amountPaise: 1000 },
    { key: 'coin-20', label: '₹20 coin', amountPaise: 2000 },
    { key: 'note-10', label: '₹10 note', amountPaise: 1000 },
    { key: 'note-20', label: '₹20 note', amountPaise: 2000 },
    { key: 'note-50', label: '₹50 note', amountPaise: 5000 },
    { key: 'note-100', label: '₹100 note', amountPaise: 10000 },
    { key: 'note-500', label: '₹500 note', amountPaise: 50000 },
    { key: 'note-1000', label: '₹1,000 note (legacy)', amountPaise: 100000 },
    { key: 'note-2000', label: '₹2,000 note ', amountPaise: 200000 },
]

export function denominationAmountPaise(row) {
    if (row.denominationKey === 'custom') {
        return rupeesToPaise(row.customAmount)
    }

    const denomination = DENOMINATIONS.find((item) => item.key === row.denominationKey)
    return denomination?.amountPaise ?? null
}

export function transactionBreakdownText(transaction) {
    if (!Array.isArray(transaction.denomination_breakdown) || transaction.denomination_breakdown.length === 0) {
        return transaction.breakdown_adjusted ? 'Amount corrected (total only)' : 'No denomination details recorded'
    }

    return transaction.denomination_breakdown
        .map((item) => `${item.label} × ${item.quantity}`)
        .join(' + ')
}