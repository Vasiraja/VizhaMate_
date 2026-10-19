import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, CircleAlert, Gift, UsersRound, WalletCards } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import useAppData from '../hooks/useAppData.js';
import { formatRupees, totalPaise } from '../utils/money.js';

function formattedDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
    if (!value) return 'Date not set';
    return new Intl.DateTimeFormat('en-IN', options).format(new Date(`${value}T00:00:00`));
}

export default function Dashboard() {
    const { activeFunction, transactions, persons, users, imports, loading } = useAppData();
    const functionTransactions = transactions.filter((item) => item.function_id === activeFunction?.function_id);
    const validTransactions = functionTransactions.filter((item) => item.status === 'valid');
    const total = totalPaise(functionTransactions);
    const distinctPeople = new Set(validTransactions.map((item) => item.person_id)).size;
    const byRecorder = users.map((user) => ({
        ...user,
        amount: totalPaise(validTransactions.filter((item) => item.recorder_id === user.user_id)),
        count: validTransactions.filter((item) => item.recorder_id === user.user_id).length,
    })).filter((user) => user.count).sort((left, right) => right.amount - left.amount);
    const duplicateCount = (() => {
        const grouped = new Map();
        for (const item of validTransactions) {
            const key = `${item.person_id}:${item.amount_paise}`;
            grouped.set(key, (grouped.get(key) || 0) + 1);
        }
        return [...grouped.values()].filter((count) => count > 1).length;
    })();
    const lastImport = imports.filter((item) => item.function_id === activeFunction?.function_id).sort((a, b) => b.imported_at.localeCompare(a.imported_at))[0];
    const recent = [...functionTransactions].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

    if (!activeFunction) return <div className="empty-state page-empty"><div className="empty-icon"><CalendarDays /></div><h2>Start with a function</h2><p>Create a function to begin recording guest gifts.</p><Link className="button button-primary" to="/functions">Create a function</Link></div>;

    return (
        <>
            <PageHeader eyebrow="FUNCTION OVERVIEW" title={activeFunction.function_name} description={`${activeFunction.host_name || 'Family function'} · ${formattedDate(activeFunction.function_date)}${activeFunction.location ? ` · ${activeFunction.location}` : ''}`} action={<span className={`status-pill ${activeFunction.status === 'closed' ? 'status-closed' : 'status-open'}`}>{activeFunction.status === 'closed' ? 'Closed' : 'Active'}</span>} />
            {loading && <div className="inline-notice">Loading local records...</div>}
            <div className="summary-grid">
                <article className="summary-card summary-primary"><span className="summary-label">{imports.some((batch) => batch.function_id === activeFunction.function_id) ? 'COMBINED RECORDED' : 'LOCAL RECORDED'}</span><WalletCards size={19} /><strong>{formatRupees(total)}</strong><small>Valid entries for this function</small></article>
                <article className="summary-card"><span className="summary-label">VALID ENTRIES</span><Gift size={19} /><strong>{validTransactions.length}</strong><small>{functionTransactions.filter((item) => item.status === 'voided').length} voided</small></article>
                <article className="summary-card"><span className="summary-label">CONFIRMED GUESTS</span><UsersRound size={19} /><strong>{distinctPeople}</strong><small>Distinct local guest records</small></article>
                <article className="summary-card"><span className="summary-label">POTENTIAL DUPLICATES</span><CircleAlert size={19} /><strong>{duplicateCount}</strong><small>Needs a human review</small></article>
            </div>
            <div className="dashboard-grid">
                <section className="panel recorder-panel">
                    <div className="panel-heading"><div><div className="eyebrow">COLLECTION BREAKDOWN</div><h2>Recorder totals</h2></div><span className="panel-count">{byRecorder.length} active</span></div>
                    {byRecorder.length ? <div className="recorder-list">{byRecorder.map((user, index) => <div className="recorder-row" key={user.user_id}><span className="recorder-rank">{String(index + 1).padStart(2, '0')}</span><span className="recorder-avatar">{user.display_name[0]?.toUpperCase()}</span><span className="recorder-info"><strong>{user.display_name}</strong><small>{user.count} {user.count === 1 ? 'entry' : 'entries'}</small></span><strong className="recorder-amount">{formatRupees(user.amount)}</strong></div>)}</div> : <div className="empty-inline">Entries from each recorder will appear here.</div>}
                    <div className="panel-footer"><span>Last import</span><strong>{lastImport ? formattedDate(lastImport.imported_at.slice(0, 10)) : 'No imports yet'}</strong></div>
                </section>
                <section className="panel recent-panel">
                    <div className="panel-heading"><div><div className="eyebrow">LATEST ACTIVITY</div><h2>Recent entries</h2></div><Link className="text-link" to="/transactions">All entries <ArrowUpRight size={15} /></Link></div>
                    {recent.length ? <div className="recent-list">{recent.map((item) => {
                        const person = persons.find((guest) => guest.person_id === item.person_id);
                        return <div className="recent-row" key={item.transaction_id}><span className="recent-initial">{person?.full_name?.[0]?.toUpperCase() || '?'}</span><span><strong>{person?.full_name || 'Unknown guest'}</strong><small>{new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></span><strong className="recent-amount">{formatRupees(item.amount_paise)}</strong></div>;
                    })}</div> : <div className="empty-inline">Your latest gift entries will show here.</div>}
                    <Link to="/entry" className="button button-secondary quick-entry"><Gift size={16} /> Add a gift entry</Link>
                </section>
            </div>
            <div className="dashboard-footnote"><CalendarDays size={15} /><span>This is a local recorded total, not a finalized amount. Review expected recorder files before closing the function.</span></div>
        </>
    );
}