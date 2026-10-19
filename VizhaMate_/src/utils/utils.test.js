import assert from 'node:assert/strict'
import test from 'node:test'
import {
    formatAmount,
    formatCompactAmount,
    paiseToRupees,
    rupeesToPaise,
} from './money.js'
import {
    isValidUuid,
    normalizeName,
    safePositivePaise,
    validateImportRecord,
} from './validation.js'

test('converts rupees and paise without accepting malformed amounts', () => {
    assert.equal(rupeesToPaise('12.34'), 1234)
    assert.equal(rupeesToPaise('0.5'), 50)
    assert.equal(rupeesToPaise('-2'), null)
    assert.equal(rupeesToPaise('1.234'), null)
    assert.equal(paiseToRupees(1234), 12.34)
})

test('formats amounts using Indian currency grouping', () => {
    assert.equal(formatAmount(123456), '₹1,235')
    assert.equal(formatCompactAmount(123456), '₹1,235')
})

test('normalizes names and validates positive paise amounts', () => {
    assert.equal(normalizeName('  Vasi   K! '), 'vasi k')
    assert.equal(safePositivePaise(100), true)
    assert.equal(safePositivePaise(0), false)
    assert.equal(safePositivePaise(1.5), false)
})

test('validates UUIDs and required import metadata', () => {
    assert.equal(isValidUuid('550e8400-e29b-41d4-a716-446655440000'), true)
    assert.equal(isValidUuid('not-a-uuid'), false)

    const validImport = {
        export_version: 1,
        function: { function_id: 'function-1', name: 'Family event' },
        transactions: [],
        persons: [],
        audit_records: [],
        source_device_id: 'device-1',
        export_id: 'export-1',
    }

    assert.deepEqual(validateImportRecord(validImport), { valid: true, errors: [] })
    assert.equal(validateImportRecord({}).valid, false)
})