import { useMemo, useState } from 'react';
import { Check, CircleAlert, Clock3, X } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import useAppData from '../hooks/useAppData.js';
import { markDuplicatesReviewed, rejectCorrection, resolveCorrection } from '../db/database.js';
import { formatRupees, parseRupees } from '../utils/money.js';

function dateText(value) {
    return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Reviews() {
    const { transactions, persons, users, correctionRequests, audits, activeFunction, activeUser } = useAppData();
    const [reviewing, setReviewing] = useState(null);
    const [correctedAmount, setCorrectedAmount] = useState('');
    const [reviewReason, setReviewReason] = useState('');
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const pending = correctionRequests.filter((request) => request.status === 'pending' && (!activeFunction || transactions.find((item) => item.transaction_id === request.transaction_id)?.function_id === activeFunction.function_id));
    const duplicateGroups = useMemo(() => {
        const groups = new Map();
        for (const item of transactions.filter((transaction) => transaction.function_id === activeFunction?.function_id && transaction.status === 'valid')) {
            const key = `${item.person_id}:${item.amount_paise}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(item);
        }
        return [...groups.entries()].filter(([, items]) => items.length > 1).map(([key, items]) => ({ key, items, reviewed: items.every((item) => item.duplicate_review === 'reviewed-separate-gifts') }));
    }, [transactions, activeFunction]);
    const selectedTransaction = reviewing && transactions.find((item) => item.transaction_id === reviewing.transaction_id);

    async function approve(event) {
        event.preventDefault();
        const amountPaise = parseRupees(correctedAmount);
        if (!amountPaise || !reviewReason.trim() || !selectedTransaction) return setError('Enter a valid whole-rupee amount and reason.');
        const now = new Date().toISOString();
        try {
            await resolveCorrection({
                request: reviewing,
                transaction: { ...selectedTransaction, amount_paise: amountPaise, updated_at: now, version: (selectedTransaction.version || 1) + 1 },
                audit: { audit_id: crypto.randomUUID(), transaction_id: selectedTransaction.transaction_id, action: 'amount-correction', old_value: { amount_paise: selectedTransaction.amount_paise }, new_value: { amount_paise: amountPaise }, changed_by: activeUser.user_id, changed_at: now, reason: reviewReason.trim() },
            });
            setReviewing(null); setNotice('Correction approved. The original amount is preserved in the audit history.'); setError('');
        } catch (saveError) { setError(saveError.message); }
    }

    async function deny(request) {
        try { await rejectCorrection(request, activeUser.user_id); setNotice('Correction request declined.'); }
        catch (saveError) { setError(saveError.message); }
    }

    async function reviewDuplicates(group) {
        try {
            await markDuplicatesReviewed({ transactions: group.items, reviewer: activeUser.user_id, reason: 'Admin reviewed; gifts confirmed as separate entries.' });
            setNotice('Duplicate candidates marked as reviewed; no transactions were changed or voided.');
        } catch (saveError) { setError(saveError.message); }
    }

    return (
        <>
            <PageHeader eyebrow="ADMIN REVIEW" title="Reviews & audit" description="Review correction requests and similar gifts without automatically changing or voiding records." />
            {notice && <div className="inline-notice notice-success">{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={15} /></button></div>}{error && <div className="inline-notice notice-error">{error}</div>}
            <section className="panel review-panel"><div className="panel-heading"><div><div className="eyebrow">ACTION REQUIRED</div><h2>Correction requests</h2></div><span className="panel-count">{pending.length} pending</span></div>
                {pending.length ? <div className="review-list">{pending.map((request) => { const transaction = transactions.find((item) => item.transaction_id === request.transaction_id); const person = persons.find((guest) => guest.person_id === transaction?.person_id); const requester = users.find((user) => user.user_id === request.requested_by); return <article className="review-item" key={request.request_id}><div className="review-item-top"><div className="review-guest"><span className="guest-avatar">{person?.full_name?.[0]?.toUpperCase() || '?'}</span><div><strong>{person?.full_name || 'Unknown guest'}</strong><small>{requester?.display_name || 'Recorder'} · {dateText(request.requested_at)}</small></div></div><span className="status-pill status-pending"><Clock3 size={12} /> Pending</span></div><p>{request.reason}</p><div className="correction-values"><span>Current amount <strong>{transaction ? formatRupees(transaction.amount_paise) : 'Unavailable'}</strong></span><span>Requested amount <strong>{formatRupees(request.requested_amount_paise)}</strong></span></div><div className="review-actions"><button className="button button-secondary" onClick={() => deny(request)}>Decline</button><button className="button button-primary" onClick={() => { setReviewing(request); setCorrectedAmount(String(Math.floor(request.requested_amount_paise / 100))); setReviewReason(request.reason); }}><Check size={15} /> Review & correct</button></div></article>; })}</div> : <div className="empty-inline review-empty">No correction requests are waiting for review.</div>}
            </section>
            <section className="panel review-panel"><div className="panel-heading"><div><div className="eyebrow">DUPLICATE CANDIDATES</div><h2>Possible repeat gifts</h2></div><span className="panel-count"><CircleAlert size={14} /> {duplicateGroups.filter((group) => !group.reviewed).length} need review</span></div>
                {duplicateGroups.length ? <div className="duplicate-review-list">{duplicateGroups.map((group) => { const person = persons.find((guest) => guest.person_id === group.items[0].person_id); return <article className={`duplicate-review-row ${group.reviewed ? 'duplicate-reviewed' : ''}`} key={group.key}><div className="review-guest"><span className="guest-avatar">{person?.full_name?.[0]?.toUpperCase() || '?'}</span><div><strong>{person?.full_name || 'Unknown guest'} · {formatRupees(group.items[0].amount_paise)}</strong><small>{group.items.length} matching amount entries · {person?.village || 'Location not added'}</small></div></div><div className="duplicate-review-detail">{group.items.map((item) => <span key={item.transaction_id}>{users.find((user) => user.user_id === item.recorder_id)?.display_name || 'Imported'} · {dateText(item.created_at)}</span>)}</div>{group.reviewed ? <span className="status-pill status-open">Reviewed</span> : <button className="button button-secondary" onClick={() => reviewDuplicates(group)}>Confirm separate gifts</button>}</article>; })}</div> : <div className="empty-inline review-empty">No matching person-and-amount groups found for this function.</div>}
            </section>
            <section className="panel review-panel"><div className="panel-heading"><div><div className="eyebrow">IMMUTABLE HISTORY</div><h2>Recent audit history</h2></div><span className="panel-count">{audits.length} changes</span></div><div className="audit-list">{[...audits].sort((a, b) => b.changed_at.localeCompare(a.changed_at)).slice(0, 30).map((audit) => <div className="audit-row" key={audit.audit_id}><span className="audit-icon"><Check size={15} /></span><div><strong>{audit.action.replaceAll('-', ' ')}</strong><small>{persons.find((person) => person.person_id === transactions.find((item) => item.transaction_id === audit.transaction_id)?.person_id)?.full_name || 'Transaction'} · {users.find((user) => user.user_id === audit.changed_by)?.display_name || 'Imported profile'} · {dateText(audit.changed_at)}</small><p>{audit.reason}</p></div><span className="audit-values">{audit.old_value?.amount_paise != null ? `${formatRupees(audit.old_value.amount_paise)} → ${formatRupees(audit.new_value?.amount_paise ?? audit.old_value.amount_paise)}` : audit.old_value?.status ? `${audit.old_value.status} → ${audit.new_value.status}` : 'Reviewed'}</span></div>)}{!audits.length && <div className="empty-inline review-empty">Corrections, voids, and review actions will appear here.</div>}</div></section>
            {reviewing && <div className="dialog-backdrop"><form className="confirm-dialog modal-form" onSubmit={approve}><button type="button" className="modal-x" onClick={() => setReviewing(null)} aria-label="Close"><X size={17} /></button><div className="eyebrow">APPROVE CORRECTION</div><h2>Update the recorded amount</h2><p>Current amount: <strong>{selectedTransaction ? formatRupees(selectedTransaction.amount_paise) : 'Unavailable'}</strong>. This change creates a permanent audit entry.</p><label className="field-label">Correct amount (whole rupees)<input inputMode="numeric" value={correctedAmount} onChange={(event) => setCorrectedAmount(event.target.value)} required /></label><label className="field-label">Admin reason<textarea value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} rows={3} required /></label><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setReviewing(null)}>Cancel</button><button className="button button-primary">Approve correction</button></div></form></div>}
        </>
    );
}