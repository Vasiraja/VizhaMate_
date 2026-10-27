import { formatAmount } from '../utils/money'
import { DENOMINATIONS, denominationAmountPaise } from '../utils/giftEntry'
import { uuid } from '../db/database'
import TamilAddressFields from './TamilAddressFields'
import VirtualEntryHistory from './VirtualEntryHistory'

export default function GiftEntryPage({
    selectedFunction,
    selectedFunctionId,
    selectedUserId,
    entryForm,
    setEntryForm,
    nameInputRef,
    suggestionList,
    denominationTotalPaise,
    saving,
    onSave,
    functionTransactions,
    recentFunctionTransactions,
    persons,
}) {
    return (
        <section className="page-section">
            <div className="panel">
                <h3>Add gift entry{selectedFunction ? ` · ${selectedFunction.name}` : ''}</h3>
                <form className="stack-form" onSubmit={onSave}>
                    <input
                        ref={nameInputRef}
                        placeholder="Guest name"
                        value={entryForm.full_name}
                        onChange={(event) => setEntryForm((current) => ({
                            ...current,
                            person_id: '',
                            full_name: event.target.value,
                            ...(current.person_id ? {
                                street: '',
                                area: '',
                                city: '',
                                district: '',
                                pincode: '',
                                relationship: '',
                                occupation: '',
                                phone_number: '',
                            } : {}),
                        }))}
                    />
                    {suggestionList.length > 0 && !entryForm.person_id && (
                        <div className="suggestions-box">
                            {suggestionList.map((person) => (
                                <button
                                    key={person.person_id}
                                    type="button"
                                    className="suggestion-item"
                                    onClick={() => setEntryForm((current) => ({
                                        ...current,
                                        person_id: person.person_id,
                                        full_name: person.full_name,
                                        street: person.street || '',
                                        area: person.area || person.village || '',
                                        city: person.city || '',
                                        district: person.district || '',
                                        pincode: person.pincode || '',
                                        relationship: person.relationship || '',
                                        occupation: person.occupation || '',
                                        phone_number: person.phone_number || '',
                                    }))}
                                >
                                    <strong>{person.full_name}</strong>
                                    <small>{person.area || person.village || 'No area'}{person.city ? `, ${person.city}` : ''}{person.district ? `, ${person.district}` : ''} · {person.phone_number || 'No phone'}</small>
                                </button>
                            ))}
                        </div>
                    )}
                    <TamilAddressFields idPrefix="guest-address" address={entryForm} onChange={setEntryForm} />
                    <div className="guest-profile-grid">
                        <input aria-label="Relationship to host" placeholder="Relationship to host" value={entryForm.relationship} onChange={(event) => setEntryForm((current) => ({ ...current, relationship: event.target.value }))} />
                        <input aria-label="Occupation" placeholder="Occupation" value={entryForm.occupation} onChange={(event) => setEntryForm((current) => ({ ...current, occupation: event.target.value }))} />
                        <input aria-label="Phone number" type="tel" placeholder="Phone number" value={entryForm.phone_number} onChange={(event) => setEntryForm((current) => ({ ...current, phone_number: event.target.value }))} />
                    </div>
                    <div className="denomination-editor">
                        <div className="denomination-heading">
                            <strong>Cash denominations</strong>
                            <button type="button" className="secondary-button" onClick={() => setEntryForm((current) => ({
                                ...current,
                                denominationRows: [...current.denominationRows, { rowId: uuid(), denominationKey: 'note-500', customAmount: '', quantity: '1' }],
                            }))}>Add row</button>
                        </div>
                        {entryForm.denominationRows.map((row) => {
                            const unitAmount = denominationAmountPaise(row)
                            const quantity = Number(row.quantity)
                            const rowTotal = unitAmount !== null && Number.isInteger(quantity) && quantity > 0 ? unitAmount * quantity : 0

                            return (
                                <div className={`denomination-row ${row.denominationKey === 'custom' ? 'has-custom-amount' : ''}`} key={row.rowId}>
                                    <select
                                        aria-label="Currency denomination"
                                        value={row.denominationKey}
                                        onChange={(event) => setEntryForm((current) => ({
                                            ...current,
                                            denominationRows: current.denominationRows.map((item) => item.rowId === row.rowId ? { ...item, denominationKey: event.target.value } : item),
                                        }))}
                                    >
                                        <optgroup label="Coins">
                                            {DENOMINATIONS.filter((item) => item.key.startsWith('coin-')).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                                        </optgroup>
                                        <optgroup label="Notes">
                                            {DENOMINATIONS.filter((item) => item.key.startsWith('note-')).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                                        </optgroup>
                                        <option value="custom">Custom amount</option>
                                    </select>
                                    {row.denominationKey === 'custom' && (
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            aria-label="Custom denomination value in rupees"
                                            placeholder="Unit value (₹)"
                                            value={row.customAmount}
                                            onChange={(event) => setEntryForm((current) => ({
                                                ...current,
                                                denominationRows: current.denominationRows.map((item) => item.rowId === row.rowId ? { ...item, customAmount: event.target.value } : item),
                                            }))}
                                        />
                                    )}
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        aria-label="Quantity"
                                        value={row.quantity}
                                        onChange={(event) => setEntryForm((current) => ({
                                            ...current,
                                            denominationRows: current.denominationRows.map((item) => item.rowId === row.rowId ? { ...item, quantity: event.target.value } : item),
                                        }))}
                                    />
                                    <strong className="denomination-row-total">{formatAmount(rowTotal)}</strong>
                                    <button
                                        type="button"
                                        className="remove-row-button"
                                        aria-label="Remove denomination row"
                                        disabled={entryForm.denominationRows.length === 1}
                                        onClick={() => setEntryForm((current) => ({
                                            ...current,
                                            denominationRows: current.denominationRows.filter((item) => item.rowId !== row.rowId),
                                        }))}
                                    >
                                        ×
                                    </button>
                                </div>
                            )
                        })}
                        <div className="denomination-grand-total">
                            <span>Gift total</span>
                            <strong>{formatAmount(denominationTotalPaise)}</strong>
                        </div>
                    </div>
                    <input placeholder="Notes" value={entryForm.notes} onChange={(event) => setEntryForm((current) => ({ ...current, notes: event.target.value }))} />
                    <button type="submit" disabled={saving || !selectedFunctionId || !selectedUserId}>
                        {saving ? 'Saving…' : 'Save gift'}
                    </button>
                </form>
            </div>

            <div className="panel function-entry-history">
                <div className="section-heading">
                    <div>
                        <h3>Function entries</h3>
                        <span>{selectedFunction?.name || 'Choose a function above'}</span>
                    </div>
                    <strong>{functionTransactions.length} entries</strong>
                </div>
                <VirtualEntryHistory
                    key={selectedFunctionId}
                    transactions={recentFunctionTransactions}
                    persons={persons}
                />
            </div>
        </section>
    )
}