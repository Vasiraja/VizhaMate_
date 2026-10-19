import { getAll, getById, importTransfer, saveRecord } from '../db/database.js';
import { totalPaise } from './money.js';

export const TRANSFER_FORMAT = 'vizhamate-function-transfer';
export const TRANSFER_VERSION = 1;

function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export async function exportFunctionTransfer(functionRecord, deviceId) {
    const [transactions, people, users, audits, requests] = await Promise.all([
        getAll('gift_transactions'), getAll('persons'), getAll('app_users'),
        getAll('transaction_audit'), getAll('correction_requests'),
    ]);
    const functionTransactions = transactions.filter((item) => item.function_id === functionRecord.function_id);
    const personIds = new Set(functionTransactions.map((item) => item.person_id));
    const userIds = new Set(functionTransactions.map((item) => item.recorder_id));
    const transactionIds = new Set(functionTransactions.map((item) => item.transaction_id));
    const exportId = crypto.randomUUID();
    const payload = {
        format: TRANSFER_FORMAT,
        format_version: TRANSFER_VERSION,
        export_id: exportId,
        source_device_id: deviceId,
        exported_at: new Date().toISOString(),
        function: functionRecord,
        people: people.filter((person) => personIds.has(person.person_id)),
        users: users.filter((user) => userIds.has(user.user_id)),
        transactions: functionTransactions,
        audits: audits.filter((audit) => transactionIds.has(audit.transaction_id)),
        correction_requests: requests.filter((request) => transactionIds.has(request.transaction_id)),
        record_count: functionTransactions.length,
        total_amount_paise: totalPaise(functionTransactions),
    };
    downloadJson(payload, `${functionRecord.function_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${exportId.slice(0, 8)}.json`);
    return payload;
}

export async function exportDatabaseBackup() {
    const records = {};
    for (const name of ['functions', 'persons', 'app_users', 'devices', 'gift_transactions', 'transaction_audit', 'import_batches', 'correction_requests', 'person_aliases']) {
        records[name] = await getAll(name);
    }
    downloadJson({ format: 'vizhamate-full-backup', format_version: 1, exported_at: new Date().toISOString(), records }, `vizhamate-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportFunctionSetup(functionRecord) {
    downloadJson({ format: 'vizhamate-function-setup', format_version: 1, function: functionRecord }, `${functionRecord.function_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-setup.json`);
}

export async function validateTransfer(file, selectedFunctionId) {
    let data;
    try {
        data = JSON.parse(await file.text());
    } catch {
        throw new Error('This file is not valid JSON. No records were changed.');
    }
    if (data?.format !== TRANSFER_FORMAT || data.format_version !== TRANSFER_VERSION) {
        throw new Error('Unsupported transfer format or version. No records were changed.');
    }
    if (!data.export_id || !data.source_device_id || !data.function?.function_id || !Array.isArray(data.transactions) || !Array.isArray(data.people) || !Array.isArray(data.users) || !Array.isArray(data.audits) || !Array.isArray(data.correction_requests)) {
        throw new Error('The file is missing required transfer records. No records were changed.');
    }
    if (data.function.function_id !== selectedFunctionId) {
        throw new Error('This file belongs to a different function ID. Import it while that function is selected.');
    }

    const personIds = new Set(data.people.map((person) => person.person_id));
    const userIds = new Set(data.users.map((user) => user.user_id));
    const seen = new Set();
    for (const transaction of data.transactions) {
        if (!transaction || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transaction.transaction_id || '')) throw new Error('A transaction has an invalid ID. No records were changed.');
        if (seen.has(transaction.transaction_id)) throw new Error('The file contains repeated transaction IDs. No records were changed.');
        seen.add(transaction.transaction_id);
        if (transaction.function_id !== selectedFunctionId || !personIds.has(transaction.person_id) || !userIds.has(transaction.recorder_id) || !Number.isSafeInteger(transaction.amount_paise) || transaction.amount_paise <= 0 || !['valid', 'voided'].includes(transaction.status)) {
            throw new Error('A transaction has invalid money, function, status, or guest/recorder references. No records were changed.');
        }
    }
    const transactionIds = new Set(data.transactions.map((item) => item.transaction_id));
    for (const item of data.audits) if (!transactionIds.has(item.transaction_id) || !item.audit_id) throw new Error('An audit record refers to a transaction missing from this file.');
    for (const item of data.correction_requests) if (!transactionIds.has(item.transaction_id) || !item.request_id) throw new Error('A correction request refers to a transaction missing from this file.');

    const [allTransactions, existingPeople, existingUsers, existingAudits, existingRequests] = await Promise.all([
        getAll('gift_transactions'), getAll('persons'), getAll('app_users'), getAll('transaction_audit'), getAll('correction_requests'),
    ]);
    const existingTransactions = allTransactions.filter((item) => item.function_id === selectedFunctionId);
    const currentTransactions = new Map(existingTransactions.map((item) => [item.transaction_id, item]));
    const currentPeople = new Map(existingPeople.map((item) => [item.person_id, item]));
    const currentUsers = new Map(existingUsers.map((item) => [item.user_id, item]));
    for (const person of data.people) {
        const current = currentPeople.get(person.person_id);
        if (current && current.full_name !== person.full_name) throw new Error(`Guest ID ${person.person_id} is already attached to a different name. Resolve the identity conflict before importing.`);
    }
    for (const user of data.users) {
        const current = currentUsers.get(user.user_id);
        if (current && current.display_name !== user.display_name) throw new Error(`Recorder ID ${user.user_id} conflicts with a local profile.`);
    }
    const auditById = new Map(existingAudits.map((item) => [item.audit_id, item]));
    for (const audit of data.audits) {
        const current = auditById.get(audit.audit_id);
        if (current && JSON.stringify(current) !== JSON.stringify(audit)) throw new Error(`Audit ID ${audit.audit_id} conflicts with a local audit record. No changes were made.`);
    }
    const requestById = new Map(existingRequests.map((item) => [item.request_id, item]));
    for (const request of data.correction_requests) {
        const current = requestById.get(request.request_id);
        if (current && JSON.stringify(current) !== JSON.stringify(request)) throw new Error(`Correction request ID ${request.request_id} conflicts with a local request. No changes were made.`);
    }

    const newTransactions = [];
    let skipped = 0;
    let conflicts = 0;
    for (const item of data.transactions) {
        const current = currentTransactions.get(item.transaction_id);
        if (!current) newTransactions.push(item);
        else if (JSON.stringify(current) === JSON.stringify(item)) skipped += 1;
        else conflicts += 1;
    }
    return {
        data,
        newTransactions,
        skipped,
        conflicts,
        newAmountPaise: totalPaise(newTransactions),
        currentCount: existingTransactions.length,
        currentAmountPaise: totalPaise(existingTransactions),
    };
}

export async function commitTransfer(preview, importingUser) {
    const { data, newTransactions } = preview;
    const batch = {
        import_id: crypto.randomUUID(),
        export_id: data.export_id,
        source_device_id: data.source_device_id,
        function_id: data.function.function_id,
        imported_by: importingUser.user_id,
        imported_at: new Date().toISOString(),
        imported_count: newTransactions.length,
        skipped_count: preview.skipped,
        conflict_count: preview.conflicts,
        accepted_amount_paise: preview.newAmountPaise,
    };
    await importTransfer({
        people: data.people,
        users: data.users,
        transactions: newTransactions,
        audits: data.audits,
        requests: data.correction_requests,
        batch,
    });
    return { ...batch, updatedCount: preview.currentCount + newTransactions.length, updatedAmountPaise: preview.currentAmountPaise + preview.newAmountPaise };
}

export async function importFunctionSetup(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch { throw new Error('This file is not valid JSON.'); }
    const record = data?.function;
    if (data?.format !== 'vizhamate-function-setup' || data.format_version !== 1 || !record?.function_id || !record?.function_name || !record?.function_date) {
        throw new Error('This is not a valid function setup file.');
    }
    const existing = await getById('functions', record.function_id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(record)) throw new Error('This function ID already exists with different details. No changes were made.');
    if (!existing) await saveRecord('functions', record);
    return record;
}