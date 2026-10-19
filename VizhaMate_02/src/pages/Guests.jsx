import { useMemo, useState } from 'react';
import { MapPin, Phone, Search, UserRoundPlus, X } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import useAppData from '../hooks/useAppData.js';
import { saveRecord } from '../db/database.js';
import { formatRupees } from '../utils/money.js';

function normalizeName(value) { return value.trim().toLocaleLowerCase().replace(/\s+/g, ' '); }

export default function Guests() {
    const { persons, transactions, functions } = useAppData();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ full_name: '', village: '', phone: '', notes: '' });
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const filtered = useMemo(() => persons.filter((person) => `${person.full_name} ${person.village || ''} ${person.phone || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [persons, search]);
    const history = selected ? transactions.filter((item) => item.person_id === selected.person_id).sort((a, b) => b.created_at.localeCompare(a.created_at)) : [];

    async function createGuest(event) {
        event.preventDefault();
        if (!form.full_name.trim()) return setError('Guest name is required.');
        const now = new Date().toISOString();
        try {
            await saveRecord('persons', { ...form, full_name: form.full_name.trim(), village: form.village.trim(), phone: form.phone.trim(), notes: form.notes.trim(), normalized_name: normalizeName(form.full_name), person_id: crypto.randomUUID(), created_at: now, updated_at: now });
            setForm({ full_name: '', village: '', phone: '', notes: '' }); setShowForm(false); setError(''); setNotice('Guest added. A matching name does not merge guest records.');
        } catch (saveError) { setError(saveError.message); }
    }

    return (
        <>
            <PageHeader eyebrow="GUEST DIRECTORY" title="Guests" description="People are identified by their own IDs. Matching names remain separate records." action={<button className="button button-primary" onClick={() => setShowForm((value) => !value)}><UserRoundPlus size={16} /> Add guest</button>} />
            {notice && <div className="inline-notice notice-success">{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={15} /></button></div>}
            {error && <div className="inline-notice notice-error">{error}</div>}
            {showForm && <section className="panel form-panel"><div className="panel-heading"><div><div className="eyebrow">NEW PERSON</div><h2>Add a guest record</h2></div></div><form className="form-grid" onSubmit={createGuest}><label className="field-label">Full name<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required maxLength={120} /></label><label className="field-label">Village / city<input value={form.village} onChange={(event) => setForm({ ...form, village: event.target.value })} /></label><label className="field-label">Phone number<input inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label className="field-label">Notes<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button button-primary">Save guest</button></div></form></section>}
            <div className="guest-layout">
                <section className="panel guest-directory"><div className="filter-bar guest-filter"><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, village or phone" /></label><span className="panel-count">{filtered.length} guests</span></div><div className="guest-list">{filtered.map((person) => {
                    const count = transactions.filter((item) => item.person_id === person.person_id && item.status === 'valid').length;
                    return <button key={person.person_id} className={`guest-row ${selected?.person_id === person.person_id ? 'guest-selected' : ''}`} onClick={() => setSelected(person)}><span className="guest-avatar">{person.full_name[0]?.toUpperCase()}</span><span className="guest-copy"><strong>{person.full_name}</strong><small>{person.village || 'Location not added'}</small></span><span className="guest-contributions">{count} {count === 1 ? 'gift' : 'gifts'}</span></button>;
                })}{!filtered.length && <div className="empty-inline">No guests match your search.</div>}</div></section>
                <aside className="panel guest-history">{selected ? <><div className="guest-profile-heading"><span className="guest-avatar guest-avatar-large">{selected.full_name[0]?.toUpperCase()}</span><div><div className="eyebrow">GUEST HISTORY</div><h2>{selected.full_name}</h2></div></div><div className="guest-facts">{selected.village && <span><MapPin size={15} /> {selected.village}</span>}{selected.phone && <span><Phone size={15} /> ••{selected.phone.slice(-4)}</span>}</div><div className="guest-history-total"><span>Recorded valid total</span><strong>{formatRupees(history.filter((item) => item.status === 'valid').reduce((total, item) => total + item.amount_paise, 0))}</strong></div><div className="history-list">{history.map((item) => { const functionRecord = functions.find((event) => event.function_id === item.function_id); return <div className="history-entry" key={item.transaction_id}><span className={`history-dot ${item.status === 'voided' ? 'dot-voided' : ''}`} /><div><strong>{functionRecord?.function_name || 'Imported function'}</strong><small>{new Date(item.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {item.status}</small></div><strong className="recent-amount">{formatRupees(item.amount_paise)}</strong></div>; })}{!history.length && <div className="empty-inline">No gifts recorded for this guest yet.</div>}</div></> : <div className="guest-history-empty"><div className="empty-icon"><Search /></div><h2>Guest details</h2><p>Select a guest to see contributions across local functions.</p></div>}</aside>
            </div>
        </>
    );
}