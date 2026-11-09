import { useState } from 'react'
import { formatAmount } from '../utils/money'
import { DENOMINATIONS, denominationAmountPaise } from '../utils/giftEntry'
import TamilAddressFields from './TamilAddressFields'
import VirtualEntryHistory from './VirtualEntryHistory'

function getRowsForDialog(denominationRows) {
    return DENOMINATIONS.map((denomination) => ({
        rowId: denomination.key,
        denominationKey: denomination.key,
        customAmount: '',
        quantity: denominationRows.find((row) => row.denominationKey === denomination.key)?.quantity || '',
    }))
}

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
    const [denominationDialogOpen, setDenominationDialogOpen] = useState(false)
    const [denominationDraftRows, setDenominationDraftRows] = useState([])
    const selectedPerson = persons.find((person) => person.person_id === entryForm.person_id)

    function openDenominationDialog() {
        setDenominationDraftRows(getRowsForDialog(entryForm.denominationRows))
        setDenominationDialogOpen(true)
    }

    function updateDraftQuantity(rowId, quantity) {
        setDenominationDraftRows((current) => current.map((row) => (
            row.rowId === rowId ? { ...row, quantity } : row
        )))
    }

    function selectPerson(person) {
        setEntryForm((current) => ({
            ...current,
            person_id: person.person_id,
            full_name: person.full_name,
            street: person.street || '',
            city: person.city || person.area || person.village || '',
            relationship: person.relationship || '',
            occupation: person.occupation || '',
            phone_number: person.phone_number || '',
        }))
    }

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
                            full_name: event.target.value,
                        }))}
                    />
                    <TamilAddressFields address={entryForm} onChange={setEntryForm} />
                    <div className="guest-profile-grid">
                        <input aria-label="Relationship to host" placeholder="Relationship to host" value={entryForm.relationship} onChange={(event) => setEntryForm((current) => ({ ...current, relationship: event.target.value }))} />
                        <input aria-label="Occupation" placeholder="Occupation" value={entryForm.occupation} onChange={(event) => setEntryForm((current) => ({ ...current, occupation: event.target.value }))} />
                    </div>
                    <div className="phone-entry-field">
                        <label htmlFor="guest-phone-number">Phone number</label>
                        <input
                            id="guest-phone-number"
                            aria-label="Phone number"
                            type="tel"
                            placeholder="Phone number"
                            value={entryForm.phone_number}
                            onChange={(event) => setEntryForm((current) => ({ ...current, phone_number: event.target.value }))}
                        />
                    </div>
                    {suggestionList.length > 0 && (
                        <div className="suggestions-box" aria-label="Saved guests matching phone number">
                            {suggestionList.map((person) => (
                                <button
                                    key={person.person_id}
                                    type="button"
                                    className={`suggestion-item ${person.person_id === entryForm.person_id ? 'is-selected' : ''}`}
                                    aria-pressed={person.person_id === entryForm.person_id}
                                    onClick={() => selectPerson(person)}
                                >
                                    <strong>{person.full_name}{person.person_id === entryForm.person_id ? ' · Selected' : ''}</strong>
                                    <small>{person.street || 'No street'}{person.city || person.area || person.village ? `, ${person.city || person.area || person.village}` : ''} · {person.phone_number || 'No phone'}</small>
                                </button>
                            ))}
                        </div>
                    )}
                    {selectedPerson && (
                        <p className="selected-guest-note">
                            Selected saved guest: {selectedPerson.full_name}
                            {selectedPerson.phone_number ? ` · ${selectedPerson.phone_number}` : ''}. Changes update this guest.
                        </p>
                    )}
                    <label className="cash-total-field">
                        <span>Cash total for one person</span>
                        <input
                            type="text"
                            readOnly
                            value={formatAmount(denominationTotalPaise)}
                            onClick={openDenominationDialog}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    openDenominationDialog()
                                }
                            }}
                            role="button"
                            aria-haspopup="dialog"
                            aria-label={`Cash total ${formatAmount(denominationTotalPaise)}. Open denomination details`}
                            placeholder="Tap to enter cash denominations"
                        />
                        <small>Tap the total to enter denominations.</small>
                    </label>
                    <input placeholder="Notes" value={entryForm.notes} onChange={(event) => setEntryForm((current) => ({ ...current, notes: event.target.value }))} />
                    <button type="submit" disabled={saving || !selectedFunctionId || !selectedUserId}>
                        {saving ? 'Saving…' : 'Save gift'}
                    </button>
                </form>
            </div>

            {denominationDialogOpen && (
                <div className="denomination-dialog-backdrop" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setDenominationDialogOpen(false)
                }}>
                    <section className="denomination-dialog" role="dialog" aria-modal="true" aria-labelledby="denomination-dialog-title">
                        <div className="denomination-heading">
                            <div>
                                <h3 id="denomination-dialog-title">Cash denominations</h3>
                                <p>Enter how many of each note or coin the guest gave.</p>
                            </div>
                            <button type="button" className="secondary-button" aria-label="Close denominations" onClick={() => setDenominationDialogOpen(false)}>×</button>
                        </div>
                        <div className="denomination-dialog-list">
                            {denominationDraftRows.map((row) => {
                                const denomination = DENOMINATIONS.find((item) => item.key === row.denominationKey)
                                const unitAmount = denominationAmountPaise(row)
                                const quantity = Number(row.quantity)
                                const rowTotal = Number.isInteger(quantity) && quantity > 0 ? unitAmount * quantity : 0

                                return (
                                    <label className="denomination-dialog-row" key={row.rowId}>
                                        <span>{denomination.label}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            inputMode="numeric"
                                            aria-label={`${denomination.label} quantity`}
                                            value={row.quantity}
                                            onChange={(event) => updateDraftQuantity(row.rowId, event.target.value)}
                                        />
                                        <strong>{formatAmount(rowTotal)}</strong>
                                    </label>
                                )
                            })}
                        </div>
                        <div className="denomination-dialog-total">
                            <span>Total for one person</span>
                            <strong>{formatAmount(denominationDraftRows.reduce((total, row) => {
                                const unitAmount = denominationAmountPaise(row)
                                const quantity = Number(row.quantity)
                                return Number.isInteger(quantity) && quantity > 0 ? total + unitAmount * quantity : total
                            }, 0))}</strong>
                        </div>
                        <div className="form-actions">
                            <button type="button" className="secondary-button" onClick={() => setDenominationDialogOpen(false)}>Cancel</button>
                            <button type="button" onClick={() => {
                                setEntryForm((current) => ({
                                    ...current,
                                    denominationRows: denominationDraftRows,
                                }))
                                setDenominationDialogOpen(false)
                            }}>Save denominations</button>
                        </div>
                    </section>
                </div>
            )}

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
