import test from 'node:test'
import assert from 'node:assert/strict'
import { createOfflineSyncCsv, parseOfflineSyncCsv } from './offlineSync.js'

const sampleRecords = {
    functions: [{ function_id: 'function-1', name: 'Family, Wedding', function_date: '2026-10-27' }],
    app_users: [{ user_id: 'user-1', name: 'Recorder', role: 'Admin' }],
    persons: [{ person_id: 'person-1', full_name: 'Guest "One"', phone_number: '1234567890' }],
    gift_transactions: [{
        transaction_id: 'transaction-1',
        function_id: 'function-1',
        person_id: 'person-1',
        recorder_id: 'user-1',
        amount_paise: 125050,
        status: 'valid',
        denomination_breakdown: [{ key: 'note-500', quantity: 2 }],
    }],
    transaction_audit: [],
}

test('exports and restores Excel-compatible CSV records without losing nested data', () => {
    const csv = createOfflineSyncCsv(sampleRecords, 'device-1', '2026-10-27T00:00:00.000Z')
    const result = parseOfflineSyncCsv(csv)

    assert.equal(result.valid, true)
    assert.equal(result.metadata.source_device_id, 'device-1')
    assert.deepEqual(result.recordsByStore, sampleRecords)
    assert.match(csv, /Family, Wedding/)
    assert.match(csv, /1250\.50/)
})

test('rejects CSV files that do not use the VizhaMate export format', () => {
    const result = parseOfflineSyncCsv('name,amount\nGuest,100')

    assert.equal(result.valid, false)
    assert.match(result.errors[0], /VizhaMate/)
})

test('rejects rows whose record IDs do not match their record data', () => {
    const csv = createOfflineSyncCsv(sampleRecords, 'device-1')
        .replace('"persons","person-1"', '"persons","person-2"')
    const result = parseOfflineSyncCsv(csv)

    assert.equal(result.valid, false)
    assert.match(result.errors[0], /record ID/)
})

test('quotes spreadsheet formula-like values to prevent formula execution', () => {
    const records = {
        ...sampleRecords,
        app_users: [{ user_id: 'user-1', name: '=1+1', role: 'Recorder' }],
    }
    const csv = createOfflineSyncCsv(records, 'device-1')

    assert.match(csv, /'=1\+1/)
    assert.equal(parseOfflineSyncCsv(csv).valid, true)
})
