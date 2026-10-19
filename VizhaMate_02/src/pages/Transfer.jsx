import { useState } from 'react';
import { Check, Download, FileUp, ShieldCheck, X } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import useAppData from '../hooks/useAppData.js';
import { exportDatabaseBackup, exportFunctionTransfer, validateTransfer, commitTransfer } from '../utils/importExport.js';
import { getDeviceId } from '../db/database.js';
import { formatRupees } from '../utils/money.js';

export default function Transfer() {
    const { activeFunction, activeUser, transactions } = useAppData();
    const isAdmin = activeUser?.role === 'admin';
    const [previews, setPreviews] = useState([]);
    const [busy, setBusy] = useState(false);
    const [backedUp, setBackedUp] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const validTotal = transactions.filter((item) => item.function_id === activeFunction?.function_id && item.status === 'valid').reduce((sum, item) => sum + item.amount_paise, 0);

    async function chooseFiles(event) {
        const files = [...event.target.files || []];
        event.target.value = '';
        if (!files.length) return;
        setBusy(true); setError(''); setNotice(''); setPreviews([]); setBackedUp(false);
        const results = [];
        for (const file of files) {
            try { results.push({ name: file.name, preview: await validateTransfer(file, activeFunction?.function_id), status: 'ready' }); }
            catch (validationError) { results.push({ name: file.name, error: validationError.message, status: 'invalid' }); }
        }
        setPreviews(results); setBusy(false);
    }

    async function importReadyFiles() {
        if (!backedUp) return setError('Download a current database backup and check the confirmation before importing.');
        setBusy(true); setError(''); setNotice('');
        const updated = [...previews];
        let successCount = 0;
        for (let index = 0; index < updated.length; index += 1) {
            if (updated[index].status !== 'ready') continue;
            try {
                const result = await commitTransfer(updated[index].preview, activeUser);
                updated[index] = { ...updated[index], status: 'imported', result };
                successCount += 1;
            } catch (importError) {
                updated[index] = { ...updated[index], status: 'failed', error: importError.message || 'The import was rolled back.' };
            }
        }
        setPreviews(updated); setBusy(false);
        setNotice(`${successCount} file${successCount === 1 ? '' : 's'} imported. Each file commits separately; invalid files were not changed.`);
    }

    async function transferExport() {
        if (!activeFunction) return setError('Create or select a function before exporting.');
        try { await exportFunctionTransfer(activeFunction, await getDeviceId()); setNotice('Function transfer file downloaded. Local records remain unchanged.'); setError(''); }
        catch (exportError) { setError(exportError.message); }
    }

    async function backup() {
        try { await exportDatabaseBackup(); setBackedUp(true); setNotice('Full local backup downloaded. You can now commit the prepared imports.'); setError(''); }
        catch (backupError) { setError(backupError.message); }
    }

    return (
        <>
            <PageHeader eyebrow="OFFLINE TRANSFER" title="Import & export" description="Move a function setup and its records between devices using validated JSON files." />
            {notice && <div className="inline-notice notice-success"><Check size={16} /> {notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={15} /></button></div>}{error && <div className="inline-notice notice-error">{error}<button aria-label="Dismiss" onClick={() => setError('')}><X size={15} /></button></div>}
            <div className="transfer-grid">
                <section className="panel transfer-panel"><div className="transfer-step"><span className="step-number">01</span><div><div className="eyebrow">SHARE LOCAL RECORDS</div><h2>Export this function</h2><p>Creates a JSON transfer file with this function, its guests, transactions, and related review history.</p></div></div><div className="transfer-current"><span>{activeFunction?.function_name || 'No function selected'}</span><strong>{formatRupees(validTotal)}</strong><small>Valid amount on this device</small></div><button className="button button-primary" onClick={transferExport} disabled={!activeFunction}><Download size={16} /> Export function records</button></section>
                {isAdmin && <section className="panel transfer-panel"><div className="transfer-step"><span className="step-number">02</span><div><div className="eyebrow">PREVIEW FIRST</div><h2>Import recorder files</h2><p>Select one or more transfer files. Each file is validated and committed atomically on its own.</p></div></div><label className="drop-zone"><FileUp size={22} /><strong>{busy ? 'Checking files...' : 'Choose JSON transfer files'}</strong><span>Current function ID must match</span><input type="file" accept="application/json,.json" multiple disabled={busy || !activeFunction} onChange={chooseFiles} /></label>{activeFunction && <small className="function-id-hint">Function ID: {activeFunction.function_id}</small>}</section>}
            </div>
            {isAdmin && previews.length > 0 && <section className="panel import-preview-panel"><div className="panel-heading"><div><div className="eyebrow">VALIDATION RESULTS</div><h2>Import preview</h2></div><span className="panel-count">{previews.filter((item) => item.status === 'ready').length} ready</span></div><div className="import-preview-list">{previews.map((item, index) => <article className="import-preview-row" key={`${item.name}-${index}`}><div className="preview-file"><span className={`preview-file-icon ${item.status}`}>{item.status === 'imported' ? <Check size={16} /> : <FileUp size={16} />}</span><div><strong>{item.name}</strong>{item.preview ? <small>From device {item.preview.data.source_device_id.slice(0, 8)} · {item.preview.data.function.function_name}</small> : <small>{item.error}</small>}</div></div>{item.preview && <><div className="preview-stat"><span>New entries</span><strong>{item.preview.newTransactions.length}</strong></div><div className="preview-stat"><span>Already imported</span><strong>{item.preview.skipped}</strong></div><div className="preview-stat"><span>Conflicts</span><strong className={item.preview.conflicts ? 'text-warning' : ''}>{item.preview.conflicts}</strong></div><div className="preview-stat"><span>New valid amount</span><strong>{formatRupees(item.preview.newAmountPaise)}</strong></div></>}{item.status === 'imported' && item.result && <small className="import-result">Saved: {item.result.imported_count} new · total {formatRupees(item.result.updatedAmountPaise)}</small>}</article>)}</div><div className="backup-required"><div className="backup-recommendation"><ShieldCheck size={18} /><div><strong>Back up before importing</strong><span>A full backup provides a recovery point. Existing data will never be replaced.</span></div><button className="button button-secondary" onClick={backup}><Download size={15} /> Download backup</button></div>{backedUp && <label className="check-row"><input type="checkbox" checked={backedUp} onChange={(event) => setBackedUp(event.target.checked)} /> I downloaded a backup of this device's current database.</label>}</div><div className="import-commit-row"><span>Identical transaction IDs are skipped. Differing IDs are counted as conflicts and never overwritten.</span><button className="button button-primary" disabled={busy || !backedUp || !previews.some((item) => item.status === 'ready')} onClick={importReadyFiles}>{busy ? 'Importing...' : 'Import ready files'}</button></div></section>}
            <section className="transfer-safety-note"><ShieldCheck size={17} /><p>Import is offline and additive. It does not delete source-device records, merge guests by name, or mark the function final. Review conflicts and expected recorder files before closing.</p></section>
        </>
    );
}