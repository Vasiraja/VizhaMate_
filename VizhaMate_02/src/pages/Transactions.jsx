import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import useAppData from '../hooks/useAppData.js';
import { requestCorrection, voidTransaction } from '../db/database.js';
import { formatRupees, parseRupees, totalPaise } from '../utils/money.js';

const PAGE_SIZE = 12;

export default function Transactions() {
    const { transactions, persons, users, functions, activeFunction, activeUser, audits } = useAppData();
    const [search, setSearch] = useState('');
    const [recorder, setRecorder] = useState('all');
    const [functionFilter, setFunctionFilter] = useState('current');
    const [status, setStatus] = useState('all');
    const [date, setDate] = useState('');
    const [sort, setSort] = useState('latest');
    const [page, setPage] = useState(0);
    const [requesting, setRequesting] = useState(null);
    const [requestedAmount, setRequestedAmount] = useState('');
    const [reason, setReason] = useState('');
    const [voiding, setVoiding] = useState(null);
    const [voidReason, setVoidReason] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const visible = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        const rows = transactions.filter((item) => {
            const person = persons.find((guest) => guest.person_id === item.person_id);
                return (functionFilter === 'all' || item.function_id === (functionFilter === 'current' ? activeFunction?.function_id : functionFilter))
                && (!query || person?.full_name?.toLocaleLowerCase().includes(query))
                && (recorder === 'all' || item.recorder_id === recorder)
                && (status === 'all' || item.status === status)
                && (!date || item.created_at.slice(0, 10) === date);
        });
        rows.sort((left, right) => {
            if (sort === 'oldest') return left.created_at.localeCompare(right.created_at);
            if (sort === 'name') return (persons.find((guest) => guest.person_id === left.person_id)?.full_name || '').localeCompare(persons.find((guest) => guest.person_id === right.person_id)?.full_name || '');
            if (sort === 'amount') return right.amount_paise - left.amount_paise;
            return right.created_at.localeCompare(left.created_at);
        });
        return rows;
    }, [transactions, persons, activeFunction, functionFilter, search, recorder, status, date, sort]);
    const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
    const currentRows = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const functionRows = transactions.filter((item) => item.function_id === activeFunction?.function_id);

    function exportCsv() {
        const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const rows = [
            ['Serial', 'Guest', 'Village', 'Amount INR', 'Recorder', 'Function', 'Recorded at', 'Status'],
            ...visible.map((item, index) => [
                index + 1,
                persons.find((person) => person.person_id === item.person_id)?.full_name || '',
                persons.find((person) => person.person_id === item.person_id)?.village || '',
                Math.floor(item.amount_paise / 100),
                users.find((user) => user.user_id === item.recorder_id)?.display_name || '',
                functions.find((event) => event.function_id === item.function_id)?.function_name || '',
                item.created_at,
                item.status,
            ]),
        ];
        const content = rows.map((row) => row.map(escape).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vizhamate-transactions.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    async function submitCorrection(event) {
        event.preventDefault();
        const amountPaise = parseRupees(requestedAmount);
        if (!amountPaise || !reason.trim()) return setError('Enter a valid amount and a reason for the correction request.');
        try {
            await requestCorrection({ request_id: crypto.randomUUID(), transaction_id: requesting.transaction_id, requested_amount_paise: amountPaise, reason: reason.trim(), requested_by: activeUser.user_id, requested_at: new Date().toISOString(), status: 'pending' });
            setRequesting(null); setRequestedAmount(''); setReason(''); setMessage('Correction request sent to the local administrator.'); setError('');
        } catch (saveError) { setError(saveError.message); }
    }

    async function submitVoid(event) {
        event.preventDefault();
        if (!voidReason.trim()) return setError('Add a reason before voiding a transaction.');
        const now = new Date().toISOString();
        try {
            await voidTransaction({
                transaction: { ...voiding, status: 'voided', updated_at: now, version: (voiding.version || 1) + 1 },
                audit: { audit_id: crypto.randomUUID(), transaction_id: voiding.transaction_id, action: 'void', old_value: { amount_paise: voiding.amount_paise, status: voiding.status }, new_value: { amount_paise: voiding.amount_paise, status: 'voided' }, changed_by: activeUser.user_id, changed_at: now, reason: voidReason.trim() },
            });
            setVoiding(null); setVoidReason(''); setMessage('Transaction voided. Its audit record has been preserved.'); setError('');
        } catch (saveError) { setError(saveError.message); }
    }

    return (
        <>
            <PageHeader eyebrow="RECORD HISTORY" title="Transactions" description={`${functionRows.length} records · ${formatRupees(totalPaise(functionRows))} valid total`} action={<button className="button button-secondary" onClick={exportCsv}><Download size={15} /> Export CSV</button>} />
            {message && <div className="inline-notice notice-success">{message}<button aria-label="Dismiss" onClick={() => setMessage('')}><X size={15} /></button></div>}
            {error && <div className="inline-notice notice-error">{error}<button aria-label="Dismiss" onClick={() => setError('')}><X size={15} /></button></div>}
            <section className="panel transaction-panel">
                <div className="filter-bar"><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search guest name" /></label><select aria-label="Filter function" value={functionFilter} onChange={(event) => { setFunctionFilter(event.target.value); setPage(0); }}><option value="current">Current function</option><option value="all">All functions</option>{functions.map((event) => <option key={event.function_id} value={event.function_id}>{event.function_name}</option>)}</select><select aria-label="Filter recorder" value={recorder} onChange={(event) => { setRecorder(event.target.value); setPage(0); }}><option value="all">All recorders</option>{users.map((user) => <option key={user.user_id} value={user.user_id}>{user.display_name}</option>)}</select><select aria-label="Filter status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="all">All statuses</option><option value="valid">Valid</option><option value="voided">Voided</option></select><input type="date" aria-label="Filter date" value={date} onChange={(event) => { setDate(event.target.value); setPage(0); }} /><select aria-label="Sort transactions" value={sort} onChange={(event) => setSort(event.target.value)}><option value="latest">Latest first</option><option value="oldest">Oldest first</option><option value="name">Guest name</option><option value="amount">Highest amount</option></select></div>
                <div className="table-wrap"><table className="data-table"><thead><tr><th>#</th><th>Guest</th><th>Recorder</th><th>Date & time</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{currentRows.map((item, index) => {
                    const person = persons.find((guest) => guest.person_id === item.person_id);
                    const transactionUser = users.find((user) => user.user_id === item.recorder_id);
                    const history = audits.filter((audit) => audit.transaction_id === item.transaction_id);
                    return <tr key={item.transaction_id} className={item.status === 'voided' ? 'row-voided' : ''}><td className="serial-cell">{page * PAGE_SIZE + index + 1}</td><td><strong className="table-primary">{person?.full_name || 'Unknown guest'}</strong><span className="table-secondary">{person?.village || 'Location not added'}</span></td><td>{transactionUser?.display_name || 'Imported profile'}</td><td>{new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{history.length > 0 && <span className="table-secondary">{history.length} audit {history.length === 1 ? 'entry' : 'entries'}</span>}</td><td className="amount-cell">{formatRupees(item.amount_paise)}</td><td><span className={`status-pill ${item.status === 'valid' ? 'status-open' : 'status-closed'}`}>{item.status}</span></td><td>{item.status === 'valid' && <div className="table-actions">{activeUser?.role === 'admin' ? <button className="table-action-danger" onClick={() => setVoiding(item)}>Void</button> : item.recorder_id === activeUser?.user_id && <button className="table-action" onClick={() => { setRequesting(item); setRequestedAmount(String(Math.floor(item.amount_paise / 100))); }}>Request correction</button>}</div>}</td></tr>;
                })}</tbody></table></div>
                {!currentRows.length && <div className="empty-inline table-empty">No transactions match these filters.</div>}
                <div className="table-footer"><span>Showing {visible.length ? page * PAGE_SIZE + 1 : 0}–{Math.min((page + 1) * PAGE_SIZE, visible.length)} of {visible.length}</span><div className="pagination"><button className="icon-button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={17} /></button><span>{page + 1} / {pageCount}</span><button className="icon-button" aria-label="Next page" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight size={17} /></button></div></div>
            </section>
            {requesting && <div className="dialog-backdrop"><form className="confirm-dialog modal-form" onSubmit={submitCorrection}><button type="button" className="modal-x" onClick={() => setRequesting(null)} aria-label="Close"><X size={17} /></button><div className="eyebrow">CORRECTION REQUEST</div><h2>Request an amount change</h2><p>Original amount: <strong>{formatRupees(requesting.amount_paise)}</strong>. An admin must review this request.</p><label className="field-label">Correct amount (whole rupees)<input inputMode="numeric" value={requestedAmount} onChange={(event) => setRequestedAmount(event.target.value)} required /></label><label className="field-label">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} required /></label><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setRequesting(null)}>Cancel</button><button className="button button-primary">Send request</button></div></form></div>}
            {voiding && <div className="dialog-backdrop"><form className="confirm-dialog modal-form" onSubmit={submitVoid}><button type="button" className="modal-x" onClick={() => setVoiding(null)} aria-label="Close"><X size={17} /></button><div className="eyebrow">VOID TRANSACTION</div><h2>Keep the record, remove it from totals</h2><p>{formatRupees(voiding.amount_paise)} from {persons.find((person) => person.person_id === voiding.person_id)?.full_name || 'this guest'} will be excluded from valid totals. The original entry remains in history.</p><label className="field-label">Reason<textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} rows={3} required /></label><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setVoiding(null)}>Cancel</button><button className="button button-danger">Void transaction</button></div></form></div>}
        </>
    );
}