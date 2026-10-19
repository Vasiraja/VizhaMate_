const NAME_SPACING_PATTERN = /\s+/g
const NON_NAME_CHARACTER_PATTERN = /[^a-z0-9 ]/g
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeName(value = '') {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(NAME_SPACING_PATTERN, ' ')
        .replace(NON_NAME_CHARACTER_PATTERN, '')
}

export function isValidUuid(value) {
    return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function safePositivePaise(value) {
    return Number.isInteger(value) && value > 0
}

export function validateImportRecord(payload) {
    const errors = []

    if (!payload || typeof payload !== 'object') {
        return { valid: false, errors: ['Import payload must be an object.'] }
    }

    if (!payload.export_version || payload.export_version !== 1) {
        errors.push('Unsupported export format version.')
    }

    if (!payload.function?.function_id || !payload.function?.name) {
        errors.push('Function metadata is missing.')
    }

    if (!Array.isArray(payload.transactions)) {
        errors.push('Transaction list is missing.')
    }

    if (!Array.isArray(payload.persons)) {
        errors.push('Person list is missing.')
    }

    if (!Array.isArray(payload.audit_records)) {
        errors.push('Audit record list is missing.')
    }

    if (!payload.source_device_id || typeof payload.source_device_id !== 'string') {
        errors.push('Source device ID is missing.')
    }

    if (!payload.export_id || typeof payload.export_id !== 'string') {
        errors.push('Export ID is missing.')
    }

    return { valid: errors.length === 0, errors }
}
