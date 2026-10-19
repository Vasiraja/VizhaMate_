import { useState } from 'react'
import { formatAmount } from '../utils/money'
import { transactionBreakdownText } from '../utils/giftEntry'

const ROW_HEIGHT = 88
const VIEWPORT_HEIGHT = 440
const OVERSCAN = 4

export default function VirtualEntryHistory({ transactions, persons }) {
    const [scrollTop, setScrollTop] = useState(0)
    const firstVisibleIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
    const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2
    const visibleTransactions = transactions.slice(firstVisibleIndex, firstVisibleIndex + visibleCount)

    if (transactions.length === 0) {
        return <p className="empty-state">No gifts recorded for this function yet.</p>
    }

    return (
        <div className="virtual-entry-scroll" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
            <ul
                className="virtual-entry-list"
                aria-label="Gift entries for selected function"
                style={{ height: transactions.length * ROW_HEIGHT }}
            >
                {visibleTransactions.map((transaction, offset) => {
                    const index = firstVisibleIndex + offset
                    const guest = persons.find((person) => person.person_id === transaction.person_id)
                    const detail = transactionBreakdownText(transaction)

                    return (
                        <li
                            className="virtual-entry-item"
                            key={transaction.transaction_id}
                            style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                        >
                            <div className="virtual-entry-copy">
                                <strong>{guest?.full_name || 'Unknown guest'}</strong>
                                <span title={detail}>{detail}</span>
                            </div>
                            <div className="virtual-entry-meta">
                                <strong>{formatAmount(transaction.amount_paise)}</strong>
                                <time>{new Date(transaction.created_at).toLocaleDateString('en-IN')}</time>
                                <span className={transaction.status === 'valid' ? 'entry-status valid' : 'entry-status voided'}>{transaction.status}</span>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}