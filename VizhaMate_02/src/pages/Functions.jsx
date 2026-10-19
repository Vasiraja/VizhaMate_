import { useState } from 'react';
import { Download, Plus, Upload, UsersRound } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import useAppData from '../hooks/useAppData.js';
import { saveRecord } from '../db/database.js';
import { exportFunctionSetup, importFunctionSetup } from '../utils/importExport.js';

const functionTypes = ['Marriage', 'Engagement', 'Ear Piercing', 'Birthday', 'Other'];

export default function Functions() {
    const { functions, users, refresh } = useAppData();
    const [showForm, setShowForm] = useState(false);
    const [confirming, setConfirming] = useState(null);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [form, setForm] = useState({ function_name: '', function_type: 'Marriage', host_name: '', function_date: '', location: '' });
    const [profileName, setProfileName] = useState('');
    const [profileRole, setProfileRole] = useState('recorder');

    async function createFunction(event) {
        event.preventDefault();
        setError('');
        try {
            await saveRecord('functions', { ...form, function_id: crypto.randomUUID(), created_at: new Date().toISOString(), status: 'active' });
            setForm({ function_name: '', function_type: 'Marriage', host_name: '', function_date: '', location: '' });
            setShowForm(false);
            setNotice('Function created. Export its setup file so other devices can use the same function ID.');
        } catch (saveError) { setError(saveError.message); }
    }

    async function createProfile(event) {
        event.preventDefault();
        setError('');
        try {
            await saveRecord('app_users', { user_id: crypto.randomUUID(), display_name: profileName.trim(), role: profileRole, created_at: new Date().toISOString() });
            setProfileName('');
            setNotice('Local profile created. Select it from the profile menu to use it.');
        } catch (saveError) { setError(saveError.message); }
    }

    async function closeFunction() {
        const record = confirming;
        setConfirming(null);
        await saveRecord('functions', { ...record, status: record.status === 'closed' ? 'active' : 'closed', closed_at: record.status === 'active' ? new Date().toISOString() : null });
        setNotice(record.status === 'active' ? 'Function closed. Entry is disabled until it is reopened.' : 'Function reopened.');
    }

    async function setupImport(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setError('');
        try { await importFunctionSetup(file); await refresh(); setNotice('Function setup imported. The original function ID is preserved.'); }
        catch (importError) { setError(importError.message); }
    }

    return (
        <>
            <PageHeader eyebrow="SETUP" title="Functions & recorders" description="Manage event details and the local profiles that record gifts." action={<button className="button button-primary" onClick={() => setShowForm((value) => !value)}><Plus size={16} /> New function</button>} />
            {notice && <div className="inline-notice notice-success">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
            {error && <div className="inline-notice notice-error">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
            {showForm && <section className="panel form-panel"><div className="panel-heading"><div><div className="eyebrow">NEW EVENT</div><h2>Create a function</h2></div></div><form className="form-grid" onSubmit={createFunction}>
                <label className="field-label">Function name<input required maxLength={100} value={form.function_name} onChange={(event) => setForm({ ...form, function_name: event.target.value })} placeholder="e.g. Arun Marriage" /></label>
                <label className="field-label">Function type<select value={form.function_type} onChange={(event) => setForm({ ...form, function_type: event.target.value })}>{functionTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label className="field-label">Host / family name<input value={form.host_name} onChange={(event) => setForm({ ...form, host_name: event.target.value })} placeholder="e.g. Arun Family" /></label>
                <label className="field-label">Function date<input type="date" required value={form.function_date} onChange={(event) => setForm({ ...form, function_date: event.target.value })} /></label>
                <label className="field-label">Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Town or venue" /></label>
                <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="button button-primary">Create function</button></div>
            </form></section>}

            <section className="panel function-panel"><div className="panel-heading"><div><div className="eyebrow">FUNCTION REGISTER</div><h2>Saved functions</h2></div><label className="button button-secondary upload-button"><Upload size={15} /> Import setup<input type="file" accept="application/json,.json" onChange={setupImport} /></label></div>
                {functions.length ? <div className="function-list">{functions.map((item) => <article className="function-row" key={item.function_id}><div className="function-date-block"><strong>{new Date(`${item.function_date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit' })}</strong><span>{new Date(`${item.function_date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span></div><div className="function-copy"><strong>{item.function_name}</strong><span>{item.function_type} · {item.host_name || 'Family name not set'}{item.location ? ` · ${item.location}` : ''}</span><small>ID: {item.function_id}</small></div><span className={`status-pill ${item.status === 'closed' ? 'status-closed' : 'status-open'}`}>{item.status === 'closed' ? 'Closed' : 'Active'}</span><div className="row-actions"><button className="icon-action" title="Export function setup" onClick={() => exportFunctionSetup(item)}><Download size={16} /></button><button className="button button-secondary compact-button" onClick={() => setConfirming(item)}>{item.status === 'active' ? 'Close' : 'Reopen'}</button></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Plus /></div><h3>No functions yet</h3><p>Create an event, then share its setup file with every recorder device.</p></div>}
            </section>

            <section className="panel recorder-manage-panel"><div className="panel-heading"><div><div className="eyebrow">LOCAL ACCESS</div><h2>Recorder profiles</h2></div><span className="panel-count"><UsersRound size={14} /> {users.length} profiles</span></div><div className="profile-manage-list">{users.map((user) => <div className="profile-manage-row" key={user.user_id}><span className="profile-initial">{user.display_name[0]?.toUpperCase()}</span><strong>{user.display_name}</strong><span className="role-label">{user.role === 'admin' ? 'Admin' : 'Recorder'}</span></div>)}</div><form className="inline-profile-form" onSubmit={createProfile}><input aria-label="New profile name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="New recorder name" required maxLength={60} /><select aria-label="New profile role" value={profileRole} onChange={(event) => setProfileRole(event.target.value)}><option value="recorder">Recorder</option><option value="admin">Admin</option></select><button className="button button-secondary"><Plus size={15} /> Add profile</button></form></section>
            {confirming && <ConfirmDialog title={`${confirming.status === 'active' ? 'Close' : 'Reopen'} ${confirming.function_name}?`} message={confirming.status === 'active' ? 'No new gift entries can be added while this function is closed. Existing records remain available.' : 'This function will accept new gift entries again.'} confirmLabel={confirming.status === 'active' ? 'Close function' : 'Reopen function'} onClose={() => setConfirming(null)} onConfirm={closeFunction} />}
        </>
    );
}