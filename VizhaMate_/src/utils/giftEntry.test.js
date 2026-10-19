import assert from 'node:assert/strict'
import test from 'node:test'
import {
    DENOMINATIONS,
    denominationAmountPaise,
    transactionBreakdownText,
} from './giftEntry.js'

test('keeps denomination values in paise', () => {
    assert.equal(DENOMINATIONS.length, 12)
    assert.equal(denominationAmountPaise({ denominationKey: 'note-500' }), 50000)
    assert.equal(denominationAmountPaise({ denominationKey: 'custom', customAmount: '12.34' }), 1234)
    assert.equal(denominationAmountPaise({ denominationKey: 'unknown' }), null)
})

test('formats recorded denomination rows in their original order', () => {
    const transaction = {
        denomination_breakdown: [
            { label: '₹500 note', quantity: 1 },
            { label: '₹100 note', quantity: 1 },
            { label: '₹1 coin', quantity: 1 },
        ],
    }

    assert.equal(
        transactionBreakdownText(transaction),
        '₹500 note × 1 + ₹100 note × 1 + ₹1 coin × 1'
    )
})

test('keeps the existing text for missing denomination details', () => {
    assert.equal(transactionBreakdownText({ denomination_breakdown: [] }), 'No denomination details recorded')
    assert.equal(
        transactionBreakdownText({ denomination_breakdown: [], breakdown_adjusted: true }),
        'Amount corrected (total only)'
    )
})