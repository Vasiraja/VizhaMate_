import { normalizeName } from './validation.js'

export function getGuestSuggestions(persons, fullName) {
    const query = fullName.trim().toLowerCase()
    if (!query) return []

    const normalizedQuery = normalizeName(query)

    return persons
        .filter((person) => normalizeName(person.full_name).includes(normalizedQuery))
        .slice(0, 8)
}

export function getFunctionTransactions(transactions, functionId) {
    if (!functionId) return []
    return transactions.filter((transaction) => transaction.function_id === functionId)
}

export function sortRecentTransactions(transactions) {
    return [...transactions].sort(
        (firstTransaction, secondTransaction) => new Date(secondTransaction.created_at) - new Date(firstTransaction.created_at)
    )
}

export function calculateValidFunctionTotal(transactions) {
    return transactions
        .filter((transaction) => transaction.status === 'valid')
        .reduce((total, transaction) => total + Number(transaction.amount_paise || 0), 0)
}

export function filterTransactions(transactions, persons, transactionFilter) {
    const searchText = transactionFilter.search.trim().toLowerCase()

    return [...transactions]
        .filter((transaction) => {
            const person = persons.find((item) => item.person_id === transaction.person_id)
            const guestName = (person?.full_name || '').toLowerCase()
            const matchesSearch = !searchText || guestName.includes(searchText)
            const matchesStatus = transactionFilter.status === 'all' || transaction.status === transactionFilter.status
            const matchesRecorder =
                transactionFilter.recorder === 'all' || transaction.recorder_id === transactionFilter.recorder

            return matchesSearch && matchesStatus && matchesRecorder
        })
        .sort(
            (firstTransaction, secondTransaction) => new Date(secondTransaction.created_at) - new Date(firstTransaction.created_at)
        )
}

export function calculateDashboardStats(functionTransactions, users) {
    const validTransactions = functionTransactions.filter((transaction) => transaction.status === 'valid')
    const uniqueGuestIds = new Set(validTransactions.map((transaction) => transaction.person_id))
    const voidedCount = functionTransactions.filter((transaction) => transaction.status === 'voided').length

    const duplicateCount = functionTransactions.filter((transaction) => {
        const hasMatchingTransaction = functionTransactions.some(
            (otherTransaction) =>
                otherTransaction.person_id === transaction.person_id &&
                otherTransaction.amount_paise === transaction.amount_paise &&
                otherTransaction.status === 'valid' &&
                otherTransaction.transaction_id !== transaction.transaction_id
        )

        return hasMatchingTransaction && transaction.status === 'valid'
    }).length

    const recorderTotals = {}
    validTransactions.forEach((transaction) => {
        const recorderName = users.find((user) => user.user_id === transaction.recorder_id)?.name || 'Unknown'
        recorderTotals[recorderName] = (recorderTotals[recorderName] || 0) + Number(transaction.amount_paise || 0)
    })

    const totalAmountPaise = validTransactions.reduce(
        (total, transaction) => total + Number(transaction.amount_paise || 0),
        0
    )

    return {
        validTx: validTransactions.length,
        total: totalAmountPaise,
        guests: uniqueGuestIds.size,
        voided: voidedCount,
        duplicates: duplicateCount,
        recorderTotals,
    }
}