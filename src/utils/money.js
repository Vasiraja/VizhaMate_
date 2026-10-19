export function formatAmount(amountPaise) {
    const roundedPaise = Number.isFinite(amountPaise) ? Math.max(0, Math.round(amountPaise)) : 0
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(roundedPaise / 100)
}

export function formatCompactAmount(amountPaise) {
    const amountRupees = Math.round(amountPaise / 100)
    return `₹${new Intl.NumberFormat('en-IN').format(amountRupees)}`
}

export function rupeesToPaise(value) {
    if (value === null || value === undefined || value === '') {
        return null
    }

    const amountText = String(value).trim()
    if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
        return null
    }

    const [rupeesText, paiseText = ''] = amountText.split('.')
    const rupees = Number(rupeesText || 0)
    const paise = Number((paiseText + '00').slice(0, 2))

    if (!Number.isFinite(rupees) || !Number.isFinite(paise)) {
        return null
    }

    return rupees * 100 + paise
}

export function paiseToRupees(paise) {
    return Number((Number(paise || 0) / 100).toFixed(2))
}

export function safeInteger(value) {
    return Number.isInteger(value) && value > 0
}
