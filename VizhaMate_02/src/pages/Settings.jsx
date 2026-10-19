import { useEffect, useState } from 'react';
import { Database, Download, ShieldCheck } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import useAppData from '../hooks/useAppData.js';
import { exportDatabaseBackup } from '../utils/importExport.js';

export default function Settings() {
    const { devices, functions, persons, transactions, audits, imports, correctionRequests, activeUser } = useAppData();
    const [persistent, setPersistent] = useState(null);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    useEffect(() => { navigator.storage?.persisted?.().then(setPersistent).catch(() => setPersistent(false)); }, []);

    async function downloadBackup() {
        try { await exportDatabaseBackup(); setNotice('Full database backup downloaded.'); setError(''); }
        catch (backupError) { setError(backupError.message); }
    }

    return (
        <>
            <PageHeader eyebrow="LOCAL DATA" title="Settings & backup" description="Review this browser's storage and export a full recovery copy." />
            {notice && <div className="inline-notice notice-success">{notice}</div>}{error && <div className="inline-notice notice-error">{error}</div>}
            <section className="panel settings-panel"><div className="panel-heading"><div><div className="eyebrow">STORAGE STATUS</div><h2>This browser</h2></div><Database size={19} className="muted-icon" /></div><div className="settings-rows"><div className="settings-row"><span>Browser storage</span><strong>{persistent === null ? 'Checking...' : persistent ? 'Persistence granted' : 'Best effort (not guaranteed)'}</strong></div><div className="settings-row"><span>Current profile</span><strong>{activeUser?.display_name || 'Not selected'} · {activeUser?.role || ''}</strong></div><div className="settings-row"><span>Local device ID</span><strong className="mono-value">{devices[0]?.device_id || 'Created when first needed'}</strong></div><div className="settings-row"><span>Functions</span><strong>{functions.length}</strong></div><div className="settings-row"><span>Guest records</span><strong>{persons.length}</strong></div><div className="settings-row"><span>Transactions</span><strong>{transactions.length}</strong></div><div className="settings-row"><span>Audit records</span><strong>{audits.length}</strong></div><div className="settings-row"><span>Import batches</span><strong>{imports.length}</strong></div><div className="settings-row"><span>Correction requests</span><strong>{correctionRequests.length}</strong></div></div><button className="button button-primary settings-backup-button" onClick={downloadBackup}><Download size={16} /> Download full database backup</button></section>
            <section className="panel data-safety-panel"><div className="safety-heading"><ShieldCheck size={19} /><h2>About local data</h2></div><div className="safety-copy"><p>VizhaMate stores transactions in IndexedDB in this browser profile. Browser persistence may be denied or removed when site data is cleared, the profile is deleted, or the device is lost.</p><p>Export a full backup regularly. Function transfer files are separate and intended for merging records from other offline devices.</p><p>Profile roles only shape the workflow. They are not authentication or a security boundary for this device.</p></div></section>
        </>
    );
}