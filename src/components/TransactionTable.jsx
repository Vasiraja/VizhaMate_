import { Fragment } from 'react'
import { formatAmount, paiseToRupees } from '../utils/money'
import { transactionBreakdownText } from '../utils/giftEntry'

export default function TransactionTable({ transactions, persons, users, isAdmin, onCorrect, onVoid }) {
    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Guest</th>
                        <th>Village</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                        {isAdmin && <th>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((transaction, index) => {
                        const guest = persons.find((person) => person.person_id === transaction.person_id)
                        const recorder = users.find((user) => user.user_id === transaction.recorder_id)

                        return (
                            <Fragment key={transaction.transaction_id}>
                                <tr>
                                    <td>{index + 1}</td>
                                    <td>{guest?.full_name || 'Unknown guest'}</td>
                                    <td>{guest?.village || '—'}</td>
                                    <td>{formatAmount(transaction.amount_paise)}</td>
                                    <td>{recorder?.name || 'Unknown'}</td>
                                    <td>{new Date(transaction.created_at).toLocaleString('en-IN')}</td>
                                    <td>{transaction.status}</td>
                                    {isAdmin && (
                                        <td className="table-actions">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const amount = window.prompt(
                                                        'Enter corrected amount in rupees',
                                                        paiseToRupees(transaction.amount_paise)
                                                    )
                                                    if (amount !== null && amount !== '') {
                                                        onCorrect(transaction.transaction_id, amount, 'Admin correction')
                                                    }
                                                }}
                                            >
                                                Correct
                                            </button>
                                            <button
                                                type="button"
                                                className="danger"
                                                onClick={() => {
                                                    const reason = window.prompt(
                                                        'Reason for voiding the transaction',
                                                        'Duplicate / incorrect entry'
                                                    )
                                                    if (reason) {
                                                        onVoid(transaction.transaction_id, reason)
                                                    }
                                                }}
                                            >
                                                Void
                                            </button>
                                        </td>
                                    )}
                                </tr>
                                <tr className="transaction-detail-row">
                                    <td colSpan={isAdmin ? 8 : 7}>
                                        <div className="transaction-detail-layout">
                                            <div>
                                                <small>Denominations</small>
                                                <strong>{transactionBreakdownText(transaction)}</strong>
                                            </div>
                                            {transaction.notes && (
                                                <div>
                                                    <small>Notes</small>
                                                    <span>{transaction.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            </Fragment>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}