const EXPORT_VERSION = 1
const ID_FIELDS = {
    functions: 'function_id',
    app_users: 'user_id',
    persons: 'person_id',
    gift_transactions: 'transaction_id',
    transaction_audit: 'audit_id',
}
const FIXED_HEADERS = ['record_type', 'record_id']
const TRAILING_HEADERS = ['amount_rupees', 'record_json']

function csvCell(value) {
    const text = value == null ? '' : String(value)
    const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
    return `"${safeText.replaceAll('"', '""')}"`
}

function displayValues(storeName, record) {
    const values = { ...record }
    if (storeName === 'gift_transactions') {
        values.amount_rupees = (Number(record.amount_paise || 0) / 100).toFixed(2)
    }
    if (storeName === 'functions') values.name = record.name || ''
    return values
}

function parseCsvRow(text) {
    const rows = []
    let row = []
    let value = ''
    let quoted = false

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index]
        if (quoted) {
            if (character === '"' && text[index + 1] === '"') {
                value += '"'
                index += 1
            } else if (character === '"') {
                quoted = false
            } else {
                value += character
            }
        } else if (character === '"' && value.length === 0) {
            quoted = true
        } else if (character === ',') {
            row.push(value)
            value = ''
        } else if (character === '\n' || character === '\r') {
            if (character === '\r' && text[index + 1] === '\n') index += 1
            row.push(value)
            if (row.some((cell) => cell !== '')) rows.push(row)
            row = []
            value = ''
        } else {
            value += character
        }
    }

    if (quoted) throw new Error('CSV contains an unclosed quoted field.')
    row.push(value)
    if (row.some((cell) => cell !== '')) rows.push(row)
    return rows
}

export function createOfflineSyncCsv(recordsByStore, sourceDeviceId, exportedAt = new Date().toISOString()) {
    const records = Object.entries(ID_FIELDS).flatMap(([storeName]) =>
        (recordsByStore[storeName] || []).map((record) => ({ storeName, record }))
    )
    const recordFields = [...new Set(records.flatMap(({ record }) => Object.keys(record)))]
        .filter((field) => !FIXED_HEADERS.includes(field) && !TRAILING_HEADERS.includes(field))
    const headers = [...FIXED_HEADERS, ...recordFields, ...TRAILING_HEADERS]
    const rows = [[
        'metadata',
        '',
        ...recordFields.map(() => ''),
        '',
        JSON.stringify({
            export_version: EXPORT_VERSION,
            export_id: crypto.randomUUID(),
            source_device_id: sourceDeviceId,
            exported_at: exportedAt,
        }),
    ]]

    records.forEach(({ storeName, record }) => {
        const values = displayValues(storeName, record)
        rows.push([
            storeName,
            record[ID_FIELDS[storeName]],
            ...recordFields.map((field) => {
                const value = values[field]
                return value != null && typeof value === 'object' ? JSON.stringify(value) : value ?? ''
            }),
            values.amount_rupees ?? '',
            JSON.stringify(record),
        ])
    })

    return [
        headers.map(csvCell).join(','),
        ...rows.map((row) => row.map(csvCell).join(',')),
    ].join('\r\n')
}

export function parseOfflineSyncCsv(text) {
    try {
        const rows = parseCsvRow(String(text).replace(/^\uFEFF/, ''))
        const header = rows[0]
        if (
            !header ||
            !FIXED_HEADERS.every((field, index) => header[index] === field) ||
            header[header.length - 1] !== 'record_json' ||
            !header.includes('amount_rupees')
        ) {
            return { valid: false, errors: ['This is not a VizhaMate Excel-compatible CSV export.'] }
        }

        const metadataRow = rows.slice(1).find((row) => row[0] === 'metadata')
        if (!metadataRow) return { valid: false, errors: ['Export metadata is missing.'] }

        const recordJsonIndex = header.indexOf('record_json')
        const metadata = JSON.parse(metadataRow[recordJsonIndex] || '{}')
        if (metadata.export_version !== EXPORT_VERSION || !metadata.export_id || !metadata.source_device_id) {
            return { valid: false, errors: ['Unsupported or incomplete export metadata.'] }
        }

        const recordsByStore = Object.fromEntries(Object.keys(ID_FIELDS).map((store) => [store, []]))
        for (const row of rows.slice(1)) {
            const storeName = row[0]
            if (storeName === 'metadata') continue
            if (!Object.hasOwn(ID_FIELDS, storeName)) {
                return { valid: false, errors: [`Unknown record type "${storeName}".`] }
            }

            const record = JSON.parse(row[recordJsonIndex] || '{}')
            const idField = ID_FIELDS[storeName]
            if (!record || typeof record !== 'object' || Array.isArray(record) || !record[idField] || String(record[idField]) !== row[1]) {
                return { valid: false, errors: [`Invalid ${storeName} record or record ID.`] }
            }
            recordsByStore[storeName].push(record)
        }

        return { valid: true, errors: [], metadata, recordsByStore }
    } catch (error) {
        return {
            valid: false,
            errors: [error instanceof SyntaxError ? 'CSV record data is invalid.' : error.message || 'Unable to read this CSV file.'],
        }
    }
}
