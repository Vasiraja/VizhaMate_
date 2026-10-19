import assert from 'node:assert/strict'
import test from 'node:test'
import {
    calculateDashboardStats,
    calculateValidFunctionTotal,
    filterTransactions,
    getFunctionTransactions,
    getGuestSuggestions,
    sortRecentTransactions,
} from './ledger.js'

test('finds normalized guest-name suggestions and limits the list to eight', () => {
    const persons = Array.from({ length: 9 }, (_, index) => ({
        person_id: `person-${index}`,
        full_name: `Vasi ${index}`,
    }))

    assert.equal(getGuestSuggestions(persons, ' vasi ').length, 8)
    assert.deepEqual(getGuestSuggestions(persons, ''), [])
})

test('gets transactions for the selected function and sorts newest first', () => {
    const transactions = [
        { transaction_id: 'older', function_id: 'function-1', created_at: '2026-01-01T10:00:00Z' },
        { transaction_id: 'other', function_id: 'function-2', created_at: '2026-01-03T10:00:00Z' },
        { transaction_id: 'newer', function_id: 'function-1', created_at: '2026-01-02T10:00:00Z' },
    ]
    const selectedTransactions = getFunctionTransactions(transactions, 'function-1')

    assert.deepEqual(
        sortRecentTransactions(selectedTransactions).map((transaction) => transaction.transaction_id),
        ['newer', 'older']
    )
    assert.deepEqual(getFunctionTransactions(transactions, ''), [])
})

test('filters transactions by guest, status, and recorder', () => {
    const transactions = [
        { transaction_id: 'match', person_id: 'person-1', status: 'valid', recorder_id: 'user-1', created_at: '2026-01-02' },
        { transaction_id: 'wrong-status', person_id: 'person-1', status: 'voided', recorder_id: 'user-1', created_at: '2026-01-03' },
        { transaction_id: 'wrong-recorder', person_id: 'person-1', status: 'valid', recorder_id: 'user-2', created_at: '2026-01-04' },
    ]
    const persons = [{ person_id: 'person-1', full_name: 'Vasi Kumar' }]
    const filters = { search: 'vasi', status: 'valid', recorder: 'user-1' }

    assert.deepEqual(
        filterTransactions(transactions, persons, filters).map((transaction) => transaction.transaction_id),
        ['match']
    )
})

test('counts only valid gifts in totals and dashboard statistics', () => {
    const transactions = [
        { transaction_id: 'gift-1', person_id: 'person-1', amount_paise: 50000, status: 'valid', recorder_id: 'user-1' },
        { transaction_id: 'gift-2', person_id: 'person-1', amount_paise: 50000, status: 'valid', recorder_id: 'user-2' },
        { transaction_id: 'voided-gift', person_id: 'person-1', amount_paise: 50000, status: 'voided', recorder_id: 'user-1' },
    ]
    const users = [
        { user_id: 'user-1', name: 'Recorder One' },
        { user_id: 'user-2', name: 'Recorder Two' },
    ]

    assert.equal(calculateValidFunctionTotal(transactions), 100000)
    assert.deepEqual(calculateDashboardStats(transactions, users), {
        validTx: 2,
        total: 100000,
        guests: 1,
        voided: 1,
        duplicates: 2,
        recorderTotals: { 'Recorder One': 50000, 'Recorder Two': 50000 },
    })
})