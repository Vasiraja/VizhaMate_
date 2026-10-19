import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleAlert, Clock3, Gift, RotateCcw } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import GuestAutocomplete from '../components/GuestAutocomplete.jsx';
import useAppData from '../hooks/useAppData.js';
import { getDeviceId, saveGiftTransaction } from '../db/database.js';
import { formatRupees, parseRupees } from '../utils/money.js';

function normalizeName(value) {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export default function Entry() {
    const { activeFunction, activeUser, persons, transactions } = useAppData();
    const [guestName, setGuestName] = useState('');
    const [village, setVillage] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [duplicateWarning, setDuplicateWarning] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [lastSaved, setLastSaved] = useState(null);
    const transactionId = useRef(crypto.randomUUID());

    const possibleDuplicates = useMemo(() => {
        if (!activeFunction || !guestName.trim()) return [];
        const exactPeople = selectedPerson
            ? [selectedPerson.person_id]
            : persons.filter((person) => person.normalized_name === normalizeName(guestName)).map((person) => person.person_id);
        if (!exactPeople.length) return [];
        const ids = new Set(exactPeople);
        return transactions.filter((item) => item.function_id === activeFunction.function_id && item.status === 'valid' && ids.has(item.person_id));
    }, [activeFunction, guestName, persons, selectedPerson, transactions]);

    function onNameChange(value) {
        setGuestName(value);
        setSelectedPerson(null);
        setSuccess('');
        setDuplicateWarning(null);
    }

    function resetForm() {
        setGuestName(''); setVillage(''); setAmount(''); setNotes(''); setSelectedPerson(null);
        setDuplicateWarning(null); setSuccess(''); setError(''); transactionId.current = crypto.randomUUID();
        document.getElementById('guest-name')?.focus();
    }

    async function saveEntry(event, confirmedDuplicate = false) {
        event?.preventDefault();
        setError('');
        const amountPaise = parseRupees(amount);
        if (!activeFunction) return setError('Select or create a function before recording gifts.');
        if (activeFunction.status === 'closed') return setError('This function is closed. Reopen it before adding entries.');
        if (!guestName.trim()) return setError('Enter a guest name.');
        if (amountPaise === null) return setError('Enter a whole rupee amount greater than zero.');
        if (!confirmedDuplicate && possibleDuplicates.length) {
            setDuplicateWarning(possibleDuplicates);
            return;
        }
        setSaving(true);
        try {
            const now = new Date().toISOString();
            const person = selectedPerson
                ? selectedPerson
                : {
                    person_id: crypto.randomUUID(), full_name: guestName.trim(), normalized_name: normalizeName(guestName),
                    village: village.trim(), phone: '', notes: '', created_at: now, updated_at: now,
                };
            const deviceId = await getDeviceId();
            const transaction = {
                transaction_id: transactionId.current,
                function_id: activeFunction.function_id,
                person_id: person.person_id,
                amount_paise: amountPaise,
                recorder_id: activeUser.user_id,
                device_id: deviceId,
                created_at: now,
                updated_at: now,
                status: 'valid',
                version: 1,
                notes: notes.trim(),
                duplicate_review: possibleDuplicates.length ? 'confirmed-separate-gift' : 'not-flagged',
            };
            await saveGiftTransaction({ transaction, person });
            setLastSaved({ guest: person.full_name, amount: amountPaise, time: now });
            setSuccess('Gift saved to this device.');
            setGuestName(''); setVillage(''); setAmount(''); setNotes(''); setSelectedPerson(null); setDuplicateWarning(null);
            transactionId.current = crypto.randomUUID();
            document.getElementById('guest-name')?.focus();
        } catch (saveError) {
            setError(saveError.message || 'The gift could not be saved. Check local storage and try again.');
        } finally {
            setSaving(false);
        }
    }

    if (!activeFunction) return <div className="empty-state page-empty"><div className="empty-icon"><Gift /></div><h2>Create a function first</h2><p>Every gift must belong to a specific function.</p><Link className="button button-primary" to="/functions">Set up a function</Link></div>;

    return (
        <>
            <PageHeader eyebrow="GIFT REGISTER" title="Add a gift" description={`${activeFunction.function_name} · Recording as ${activeUser?.display_name || 'local profile'}`} />
            {activeFunction.status === 'closed' && <div className="inline-notice notice-warning"><CircleAlert size={17} /> This function is closed. New entries are disabled.</div>}
            <div className="entry-layout">
                <section className="panel entry-panel">
                    <div className="entry-panel-heading"><div className="entry-icon"><Gift size={20} /></div><div><h2>New contribution</h2><p>Saved to this device only</p></div><span className="entry-sequence"><span className="offline-dot" /> Offline ready</span></div>
                    <form className="entry-form" onSubmit={saveEntry}>
                        <div className="field-block"><label className="field-label" htmlFor="guest-name">Guest name <span className="required-mark">*</span></label><GuestAutocomplete people={persons} value={guestName} onChange={onNameChange} onSelect={(person) => { setSelectedPerson(person); setGuestName(person.full_name); setVillage(person.village || ''); setSuccess(''); }} onCreateNew={() => setSelectedPerson(null)} /><small className="field-hint">Select an existing guest to keep their person ID. Same names are never merged automatically.</small></div>
                        <div className="form-grid entry-secondary-fields">
                            <label className="field-label">Village / city<input value={village} onChange={(event) => setVillage(event.target.value)} placeholder="Optional" /></label>
                            <label className="field-label amount-field">Gift amount <span className="required-mark">*</span><span className="rupee-input"><span>₹</span><input inputMode="numeric" pattern="[0-9]*" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" aria-label="Gift amount in whole rupees" /></span><small className="field-hint">Whole rupees only</small></label>
                        </div>
                        <label className="field-label">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" rows={3} maxLength={500} /></label>
                        {duplicateWarning && <div className="duplicate-warning"><div className="warning-title"><CircleAlert size={18} /><strong>Possible duplicate gift</strong></div><p>This guest already has {duplicateWarning.length} valid {duplicateWarning.length === 1 ? 'entry' : 'entries'} in this function. Review the records before continuing.</p><div className="duplicate-existing-list">{duplicateWarning.map((item) => <div key={item.transaction_id}><span>{new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span><strong>{formatRupees(item.amount_paise)}</strong></div>)}</div><div className="duplicate-actions"><button className="button button-secondary" type="button" onClick={() => setDuplicateWarning(null)}>Review and cancel</button><button className="button button-warning" type="button" disabled={saving} onClick={() => saveEntry(null, true)}>This is a separate gift</button></div></div>}
                        {error && <div className="inline-notice notice-error" role="alert">{error}</div>}
                        {success && <div className="inline-notice notice-success" role="status"><Check size={17} /> {success}</div>}
                        <div className="entry-actions"><button type="button" className="button button-secondary" onClick={resetForm}><RotateCcw size={15} /> Clear</button><button className="button button-primary button-save" disabled={saving || activeFunction.status === 'closed'}><Check size={17} /> {saving ? 'Saving...' : 'Save gift'}</button></div>
                    </form>
                    <div className="entry-privacy"><Clock3 size={15} /><span>The entry is confirmed only after the local database commits it.</span></div>
                </section>
                <aside className="entry-aside">
                    <section className="entry-total-card"><span className="summary-label">FUNCTION TOTAL</span><strong>{formatRupees(transactions.filter((item) => item.function_id === activeFunction.function_id && item.status === 'valid').reduce((sum, item) => sum + item.amount_paise, 0))}</strong><span>{transactions.filter((item) => item.function_id === activeFunction.function_id && item.status === 'valid').length} valid entries recorded</span></section>
                    {lastSaved && <section className="panel last-entry-panel"><div className="eyebrow">LAST SAVED</div><strong>{lastSaved.guest}</strong><span>{formatRupees(lastSaved.amount)}</span><small>{new Date(lastSaved.time).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</small></section>}
                    <section className="entry-help"><h3>Entry checks</h3><ul><li>Amount is whole rupees only</li><li>Guest names can be repeated</li><li>Each save gets a unique transaction ID</li><li>Export data to move it to another device</li></ul></section>
                </aside>
            </div>
        </>
    );
}