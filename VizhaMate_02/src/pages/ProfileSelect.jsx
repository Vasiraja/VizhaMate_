import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeIndianRupee, ShieldCheck } from 'lucide-react';
import { saveRecord } from '../db/database.js';
import useAppData from '../hooks/useAppData.js';

export default function ProfileSelect() {
    const { users, chooseUser, refresh, loading } = useAppData();
    const [name, setName] = useState('');
    const [role, setRole] = useState(users.length ? 'recorder' : 'admin');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    async function createProfile(event) {
        event.preventDefault();
        if (!name.trim()) return setError('Enter a name for this local profile.');
        setSaving(true);
        try {
            const user = { user_id: crypto.randomUUID(), display_name: name.trim(), role, created_at: new Date().toISOString() };
            await saveRecord('app_users', user);
            await refresh();
            chooseUser(user.user_id);
            navigate('/');
        } catch (saveError) {
            setError(saveError.message || 'Could not create the profile.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="startup-screen">Opening local records...</div>;

    return (
        <main className="profile-screen">
            <div className="profile-panel">
                <div className="profile-brand"><div className="brand-mark"><BadgeIndianRupee size={23} /></div><span>VizhaMate</span></div>
                <div className="eyebrow">OFFLINE GIFT REGISTER</div>
                <h1>Who is recording today?</h1>
                <p className="profile-intro">Choose a local profile or create one to continue. Records stay in this browser until you export and transfer them.</p>
                {users.length > 0 && (
                    <div className="existing-profiles">
                        <div className="section-heading"><h2>Local profiles</h2><span>{users.length} available</span></div>
                        {users.map((user) => <button className="profile-option" key={user.user_id} onClick={() => { chooseUser(user.user_id); navigate('/'); }}><span className="profile-initial">{user.display_name[0]?.toUpperCase()}</span><span><strong>{user.display_name}</strong><small>{user.role === 'admin' ? 'Administrator' : 'Recorder'}</small></span><span className="option-arrow">→</span></button>)}
                    </div>
                )}
                <form className="form-stack profile-create" onSubmit={createProfile}>
                    <h2>{users.length ? 'Create another profile' : 'Create the first profile'}</h2>
                    <label className="field-label">Display name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Lakshmi" maxLength={60} required /></label>
                    <label className="field-label">Workflow role<select value={role} onChange={(event) => setRole(event.target.value)}><option value="admin">Admin</option><option value="recorder">Recorder</option></select></label>
                    {error && <p className="form-error" role="alert">{error}</p>}
                    <button className="button button-primary button-full" disabled={saving}>{saving ? 'Creating profile...' : 'Continue'}</button>
                </form>
                <div className="security-note"><ShieldCheck size={17} /><p>Profiles are workflow labels, not secure sign-in. Anyone with browser access may bypass these local role restrictions.</p></div>
            </div>
        </main>
    );
}