import { useEffect, useMemo, useRef, useState } from 'react'
import {
  executeBulkWrite,
  deleteRecord,
  initDatabase,
  listAll,
  saveRecord,
  uuid,
} from './db/database'
import {
  ArrowLeftRight,
  CalendarDays,
  CirclePlus,
  ContactRound,
  CopyCheck,
  FilePenLine,
  LayoutDashboard,
  ReceiptText,
  Settings2,
  UsersRound,
  X,
} from 'lucide-react'
import { formatAmount, formatCompactAmount, rupeesToPaise } from './utils/money'
import { DENOMINATIONS, denominationAmountPaise } from './utils/giftEntry'
import {
  calculateDashboardStats,
  calculateValidFunctionTotal,
  filterTransactions,
  getFunctionTransactions,
  getGuestSuggestions,
  sortRecentTransactions,
} from './utils/ledger'
import { normalizeName, safePositivePaise, validateImportRecord } from './utils/validation'
import { FunctionsPage, UsersPage } from './components/ManagementPages'
import GiftEntryPage from './components/GiftEntryPage'
import TransactionTable from './components/TransactionTable'
import { formatTamilAddress } from './utils/tamilAddress'
import './App.css'

const NAV_ITEMS = [
  'dashboard',
  'functions',
  'users',
  'entry',
  'transactions',
  'guests',
  'duplicates',
  'corrections',
  'import-export',
  'settings',
]
const NAV_ICONS = {
  dashboard: LayoutDashboard,
  functions: CalendarDays,
  users: UsersRound,
  entry: CirclePlus,
  transactions: ReceiptText,
  guests: ContactRound,
  duplicates: CopyCheck,
  corrections: FilePenLine,
  'import-export': ArrowLeftRight,
  settings: Settings2,
}
const emptyFunctionForm = {
  name: '',
  function_type: 'Marriage',
  host_name: '',
  function_date: '',
  location: '',
  street: '',
  area: '',
  city: '',
  district: '',
  pincode: '',
}

const emptyGuestForm = {
  person_id: '',
  full_name: '',
  street: '',
  area: '',
  city: '',
  district: '',
  pincode: '',
  relationship: '',
  occupation: '',
  phone_number: '',
  notes: '',
  denominationRows: [{ rowId: 'initial', denominationKey: 'note-500', customAmount: '', quantity: '1' }],
}

function formatFunctionDate(value) {
  if (!value) return '—'
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function App() {
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState('')
  const [users, setUsers] = useState([])
  const [functions, setFunctions] = useState([])
  const [persons, setPersons] = useState([])
  const [transactions, setTransactions] = useState([])
  const [audits, setAudits] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedFunctionId, setSelectedFunctionId] = useState('')
  const [activeTab, setActiveTab] = useState('entry')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  const [statusMessage, setStatusMessage] = useState('')
  const [functionForm, setFunctionForm] = useState(emptyFunctionForm)
  const [editingFunctionId, setEditingFunctionId] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileRole, setProfileRole] = useState('Recorder')
  const [editingUserId, setEditingUserId] = useState('')
  const [entryForm, setEntryForm] = useState(emptyGuestForm)
  const [transactionFilter, setTransactionFilter] = useState({ search: '', status: 'all', recorder: 'all' })
  const [importPreview, setImportPreview] = useState([])
  const [importSummary, setImportSummary] = useState(null)
  const [deviceId, setDeviceId] = useState('')
  const [saving, setSaving] = useState(false)
  const nameInputRef = useRef(null)

  const selectedUser = users.find((user) => user.user_id === selectedUserId) || null
  const isAdmin = selectedUser?.role === 'Admin'
  const selectedFunction = functions.find((fn) => fn.function_id === selectedFunctionId) || null

  useEffect(() => {
    let ignore = false

    async function loadData() {
      try {
        const db = await initDatabase()
        if (ignore) return
        setDbReady(true)
        const localDevice = localStorage.getItem('vizhamate-device-id') || crypto.randomUUID()
        localStorage.setItem('vizhamate-device-id', localDevice)
        setDeviceId(localDevice)

        const [functionList, userList, personList, txList, auditList] = await Promise.all([
          listAll('functions'),
          listAll('app_users'),
          listAll('persons'),
          listAll('gift_transactions'),
          listAll('transaction_audit'),
        ])

        setFunctions(functionList)
        setUsers(userList)
        setPersons(personList)
        setTransactions(txList)
        setAudits(auditList)

        if (!selectedUserId && userList[0]) {
          setSelectedUserId(userList[0].user_id)
        }

        if (!selectedFunctionId && functionList[0]) {
          setSelectedFunctionId(functionList[0].function_id)
        }

        if (!db.objectStoreNames.contains('devices')) {
          await saveRecord('devices', { device_id: localDevice, created_at: new Date().toISOString() })
        }
      } catch (error) {
        console.error(error)
        setDbError(error.message || 'Unable to initialize local database.')
      }
    }

    void loadData()
    return () => {
      ignore = true
    }
  }, [selectedFunctionId, selectedUserId])

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [activeTab, selectedFunctionId])

  useEffect(() => {
    if (!statusMessage) return undefined
    const timeoutId = window.setTimeout(() => setStatusMessage(''), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [statusMessage])

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 901px)')
    const syncSidebar = (event) => {
      setIsMobileLayout(!event.matches)
      if (!event.matches) setSidebarOpen(false)
    }
    desktopQuery.addEventListener('change', syncSidebar)
    return () => desktopQuery.removeEventListener('change', syncSidebar)
  }, [])

  const denominationTotalPaise = useMemo(
    () =>
      entryForm.denominationRows.reduce((total, row) => {
        const unitAmount = denominationAmountPaise(row)
        const quantity = Number(row.quantity)
        if (unitAmount === null || !Number.isInteger(quantity) || quantity <= 0) return total
        return total + unitAmount * quantity
      }, 0),
    [entryForm.denominationRows]
  )

  const suggestionList = useMemo(() => {
    return getGuestSuggestions(persons, entryForm.full_name)
  }, [persons, entryForm.full_name])

  const functionTransactions = useMemo(() => {
    return getFunctionTransactions(transactions, selectedFunctionId)
  }, [transactions, selectedFunctionId])

  const recentFunctionTransactions = useMemo(
    () => sortRecentTransactions(functionTransactions),
    [functionTransactions]
  )

  const validFunctionTotal = useMemo(
    () => calculateValidFunctionTotal(functionTransactions),
    [functionTransactions]
  )

  const visibleTransactions = useMemo(() => {
    return filterTransactions(functionTransactions, persons, transactionFilter)
  }, [functionTransactions, persons, transactionFilter])

  const dashboardStats = useMemo(() => {
    return calculateDashboardStats(functionTransactions, users)
  }, [functionTransactions, users])

  async function handleCreateProfile(event) {
    event.preventDefault()
    if (!profileName.trim()) {
      setStatusMessage('Please enter a profile name.')
      return
    }

    const currentUser = users.find((item) => item.user_id === editingUserId)
    const user = {
      ...currentUser,
      user_id: editingUserId || uuid(),
      name: profileName.trim(),
      role: profileRole,
      created_at: currentUser?.created_at || new Date().toISOString(),
    }

    try {
      await saveRecord('app_users', user)
      setUsers((current) => editingUserId
        ? current.map((item) => item.user_id === editingUserId ? user : item)
        : [...current, user])
      setSelectedUserId(user.user_id)
      setProfileName('')
      setProfileRole('Recorder')
      setEditingUserId('')
      setStatusMessage(currentUser ? `Profile ${user.name} updated.` : `Profile ready for ${user.name}.`)
    } catch (error) {
      setStatusMessage(error.message || 'Unable to save the profile.')
    }
  }

  async function handleCreateFunction(event) {
    event.preventDefault()
    if (!functionForm.name.trim() || !functionForm.host_name.trim()) {
      setStatusMessage('Function name and host name are required.')
      return
    }

    const existingFunction = functions.find((item) => item.function_id === editingFunctionId)
    const payload = {
      ...existingFunction,
      function_id: editingFunctionId || uuid(),
      name: functionForm.name.trim(),
      function_type: functionForm.function_type,
      host_name: functionForm.host_name.trim(),
      function_date: functionForm.function_date,
      street: functionForm.street.trim(),
      area: functionForm.area.trim(),
      city: functionForm.city.trim(),
      district: functionForm.district.trim(),
      state: 'Tamil Nadu',
      pincode: functionForm.pincode.trim(),
      location: formatTamilAddress(functionForm) || functionForm.location.trim(),
      created_at: existingFunction?.created_at || new Date().toISOString(),
    }

    try {
      await saveRecord('functions', payload)
      setFunctions((current) => editingFunctionId
        ? current.map((item) => item.function_id === editingFunctionId ? payload : item)
        : [...current, payload])
      setSelectedFunctionId(payload.function_id)
      setFunctionForm(emptyFunctionForm)
      setEditingFunctionId('')
      setStatusMessage(existingFunction ? `Function ${payload.name} updated.` : `Function ${payload.name} created.`)
    } catch (error) {
      setStatusMessage(error.message || 'Unable to create the function.')
    }
  }

  function handleEditFunction(fn) {
    setEditingFunctionId(fn.function_id)
    setFunctionForm({
      name: fn.name || '',
      function_type: fn.function_type || 'Marriage',
      host_name: fn.host_name || '',
      function_date: fn.function_date || '',
      location: fn.location || '',
      street: fn.street || (fn.area || fn.city || fn.district ? '' : fn.location || ''),
      area: fn.area || '',
      city: fn.city || '',
      district: fn.district || '',
      pincode: fn.pincode || '',
    })
    setActiveTab('functions')
  }

  async function handleDeleteFunction(fn) {
    const linkedTransactions = transactions.filter((item) => item.function_id === fn.function_id)
    if (linkedTransactions.length > 0) {
      setStatusMessage(`Cannot delete ${fn.name}: ${linkedTransactions.length} gift record(s) are attached. Export or retain the event history instead.`)
      return
    }

    try {
      const linkedBatches = (await listAll('import_batches')).filter((item) => item.function_id === fn.function_id)
      if (linkedBatches.length > 0) {
        setStatusMessage(`Cannot delete ${fn.name}: import history is attached to this function.`)
        return
      }

      if (!window.confirm(`Delete function “${fn.name}”? This cannot be undone.`)) return

      await deleteRecord('functions', fn.function_id)
      const remainingFunctions = functions.filter((item) => item.function_id !== fn.function_id)
      setFunctions(remainingFunctions)
      if (selectedFunctionId === fn.function_id) {
        setSelectedFunctionId(remainingFunctions[0]?.function_id || '')
        setEntryForm(emptyGuestForm)
      }
      setStatusMessage(`Function ${fn.name} deleted.`)
    } catch (error) {
      setStatusMessage(error.message || 'Unable to delete the function.')
    }
  }

  function handleEditUser(user) {
    setEditingUserId(user.user_id)
    setProfileName(user.name)
    setProfileRole(user.role || 'Recorder')
    setActiveTab('users')
  }

  async function handleDeleteUser(user) {
    const linkedTransactions = transactions.filter((item) => item.recorder_id === user.user_id)
    if (linkedTransactions.length > 0) {
      setStatusMessage(`Cannot delete ${user.name}: ${linkedTransactions.length} gift record(s) use this profile. The profile is retained to preserve attribution.`)
      return
    }

    if (!window.confirm(`Delete user profile “${user.name}”? This cannot be undone.`)) return

    try {
      await deleteRecord('app_users', user.user_id)
      const remainingUsers = users.filter((item) => item.user_id !== user.user_id)
      setUsers(remainingUsers)
      if (selectedUserId === user.user_id) setSelectedUserId(remainingUsers[0]?.user_id || '')
      setStatusMessage(`User profile ${user.name} deleted.`)
    } catch (error) {
      setStatusMessage(error.message || 'Unable to delete the user profile.')
    }
  }

  async function handleSaveTransaction(event) {
    event.preventDefault()
    if (!selectedFunctionId || !selectedUserId) {
      setStatusMessage('Choose a function and profile before saving.')
      return
    }

    const guestName = entryForm.full_name.trim()
    if (!guestName) {
      setStatusMessage('Guest name is required.')
      return
    }

    const matchingGuest = persons.find(
      (person) => person.person_id === entryForm.person_id || person.normalized_name === normalizeName(guestName)
    )
    const invalidBreakdown = entryForm.denominationRows.some((row) => {
      const unitAmount = denominationAmountPaise(row)
      const quantity = Number(row.quantity)
      return unitAmount === null || !safePositivePaise(unitAmount) || !Number.isInteger(quantity) || quantity <= 0
    })
    const amountPaise = denominationTotalPaise
    if (invalidBreakdown || !safePositivePaise(amountPaise)) {
      setStatusMessage('Enter a valid denomination and a whole-number quantity for every row.')
      return
    }

    const duplicateCandidates = functionTransactions.filter(
      (transaction) =>
        transaction.status === 'valid' &&
        transaction.amount_paise === amountPaise &&
        transaction.person_id === (matchingGuest?.person_id || entryForm.person_id)
    )

    if (duplicateCandidates.length > 0) {
      const continueSave = window.confirm(
        `Possible duplicate: This guest already has an entry of ${formatAmount(amountPaise)} for this function. Do you want to save as a separate gift?`
      )
      if (!continueSave) {
        setStatusMessage('Duplicate transaction cancelled.')
        return
      }
    }

    setSaving(true)
    try {
      let guestPerson = matchingGuest
      const isNewPerson = !guestPerson

      const now = new Date().toISOString()
      guestPerson = {
        ...guestPerson,
        person_id: guestPerson?.person_id || uuid(),
        full_name: guestName,
        normalized_name: normalizeName(guestName),
        street: entryForm.street.trim() || guestPerson?.street || '',
        area: entryForm.area.trim() || guestPerson?.area || guestPerson?.village || '',
        village: entryForm.area.trim() || guestPerson?.village || '',
        city: entryForm.city.trim() || guestPerson?.city || '',
        district: entryForm.district.trim() || guestPerson?.district || '',
        state: 'Tamil Nadu',
        pincode: entryForm.pincode.trim() || guestPerson?.pincode || '',
        relationship: entryForm.relationship.trim() || guestPerson?.relationship || '',
        occupation: entryForm.occupation.trim() || guestPerson?.occupation || '',
        phone_number: entryForm.phone_number.trim() || guestPerson?.phone_number || '',
        notes: entryForm.notes || guestPerson?.notes || '',
        created_at: guestPerson?.created_at || now,
        updated_at: now,
      }

      const nextTransaction = {
        transaction_id: uuid(),
        function_id: selectedFunctionId,
        person_id: guestPerson.person_id,
        amount_paise: amountPaise,
        recorder_id: selectedUserId,
        device_id: deviceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'valid',
        version: 1,
        notes: entryForm.notes || '',
        denomination_breakdown: entryForm.denominationRows.map((row) => {
          const denomination = DENOMINATIONS.find((item) => item.key === row.denominationKey)
          const unitAmount = denominationAmountPaise(row)
          return {
            key: row.denominationKey,
            label: denomination?.label || `₹${(unitAmount || 0) / 100} custom amount`,
            amount_paise: unitAmount,
            quantity: Number(row.quantity),
          }
        }),
      }

      await executeBulkWrite((dbTx) => {
        dbTx.objectStore('persons').put(guestPerson)
        dbTx.objectStore('gift_transactions').put(nextTransaction)
      })

      setPersons((current) => isNewPerson
        ? [...current, guestPerson]
        : current.map((person) => person.person_id === guestPerson.person_id ? guestPerson : person))
      setTransactions((current) => [nextTransaction, ...current])
      setEntryForm(emptyGuestForm)
      setStatusMessage(`Saved ${formatAmount(amountPaise)} for ${guestName}.`)
    } catch (error) {
      setStatusMessage(error.message || 'Unable to save the gift. Your entry is still available to retry.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCorrectTransaction(transactionId, newAmount, reason) {
    if (!isAdmin) {
      setStatusMessage('Only an Admin can correct gift entries.')
      return
    }

    const target = transactions.find((tx) => tx.transaction_id === transactionId)
    if (!target) return

    const nextPaise = rupeesToPaise(newAmount)
    if (nextPaise === null || !safePositivePaise(nextPaise)) {
      setStatusMessage('Correction amount must be valid and greater than zero.')
      return
    }

    const updated = {
      ...target,
      amount_paise: nextPaise,
      breakdown_adjusted: true,
      denomination_breakdown: [],
      updated_at: new Date().toISOString(),
    }

    const audit = {
      audit_id: uuid(),
      transaction_id: transactionId,
      action: 'corrected',
      old_value: String(target.amount_paise),
      new_value: String(nextPaise),
      changed_by: selectedUserId,
      changed_at: new Date().toISOString(),
      reason,
    }

    try {
      await executeBulkWrite((dbTx) => {
        const txStore = dbTx.objectStore('gift_transactions')
        const auditStore = dbTx.objectStore('transaction_audit')
        txStore.put(updated)
        auditStore.put(audit)
      })

      setTransactions((current) => current.map((item) => (item.transaction_id === transactionId ? updated : item)))
      setAudits((current) => [audit, ...current])
      setStatusMessage(`Amount corrected from ${formatAmount(target.amount_paise)} to ${formatAmount(nextPaise)}.`)
    } catch (error) {
      setStatusMessage(error.message || 'Unable to save the correction.')
    }
  }

  async function handleVoidTransaction(transactionId, reason) {
    if (!isAdmin) {
      setStatusMessage('Only an Admin can void gift entries.')
      return
    }

    const target = transactions.find((tx) => tx.transaction_id === transactionId)
    if (!target) return

    const updated = {
      ...target,
      status: 'voided',
      updated_at: new Date().toISOString(),
    }

    const audit = {
      audit_id: uuid(),
      transaction_id: transactionId,
      action: 'voided',
      old_value: target.status,
      new_value: 'voided',
      changed_by: selectedUserId,
      changed_at: new Date().toISOString(),
      reason,
    }

    try {
      await executeBulkWrite((dbTx) => {
        const txStore = dbTx.objectStore('gift_transactions')
        const auditStore = dbTx.objectStore('transaction_audit')
        txStore.put(updated)
        auditStore.put(audit)
      })

      setTransactions((current) => current.map((item) => (item.transaction_id === transactionId ? updated : item)))
      setAudits((current) => [audit, ...current])
      setStatusMessage('Selected transaction was voided and kept in history.')
    } catch (error) {
      setStatusMessage(error.message || 'Unable to void the transaction.')
    }
  }

  async function handleExportFunction() {
    if (!selectedFunctionId) {
      setStatusMessage('Select a function first.')
      return
    }

    const functionData = functions.find((item) => item.function_id === selectedFunctionId)
    const subsetTransactions = transactions.filter((item) => item.function_id === selectedFunctionId)
    const relevantPersons = persons.filter((person) =>
      subsetTransactions.some((transaction) => transaction.person_id === person.person_id)
    )
    const relevantAudit = audits.filter((audit) =>
      subsetTransactions.some((item) => item.transaction_id === audit.transaction_id)
    )

    const payload = {
      export_version: 1,
      export_id: uuid(),
      source_device_id: deviceId,
      exported_at: new Date().toISOString(),
      function: functionData,
      persons: relevantPersons,
      transactions: subsetTransactions,
      audit_records: relevantAudit,
      record_count: subsetTransactions.length,
      total_amount_paise: subsetTransactions
        .filter((tx) => tx.status === 'valid')
        .reduce((total, tx) => total + Number(tx.amount_paise || 0), 0),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = `${(functionData?.name || 'function').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    link.href = url
    link.download = `${safeName}-recorder-${selectedUser?.name || 'export'}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setStatusMessage('Function export has been downloaded.')
  }

  async function handleImportPreview(file) {
    const text = await file.text()
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      setStatusMessage('This import file is not valid JSON.')
      return
    }

    const result = validateImportRecord(parsed)
    const preview = {
      fileName: file.name,
      valid: result.valid,
      errors: result.errors,
      payload: parsed,
    }

    setImportPreview((current) => [...current, preview])
    setStatusMessage(result.valid ? 'File passed validation and is ready to import.' : 'Import rejected because file validation failed.')
  }

  async function handleImportFiles(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    setImportPreview([])
    setImportSummary(null)

    await Promise.all(files.map((file) => handleImportPreview(file)))
  }

  async function handleApplyImport(preview) {
    const payload = preview.payload
    const functionId = payload?.function?.function_id
    if (!functionId) {
      setStatusMessage('This file is missing the required function ID.')
      return
    }

    if (selectedFunctionId && selectedFunctionId !== functionId) {
      setStatusMessage('This import belongs to a different function. Select that function before importing.')
      return
    }

    const existingTxIds = new Map(transactions.map((item) => [item.transaction_id, item]))
    let newCount = 0
    let skippedCount = 0
    let conflictCount = 0
    const acceptedTransactions = []

    for (const transaction of payload.transactions || []) {
      const existing = existingTxIds.get(transaction.transaction_id)
      if (existing) {
        if (JSON.stringify(existing) === JSON.stringify(transaction)) {
          skippedCount += 1
        } else {
          conflictCount += 1
        }
        continue
      }

      if (!Number.isInteger(transaction.amount_paise) || transaction.amount_paise <= 0) {
        continue
      }

      acceptedTransactions.push(transaction)
      newCount += 1
    }

    const summary = {
      fileName: preview.fileName,
      totalRecords: payload.transactions?.length || 0,
      newTransactions: newCount,
      skippedDuplicates: skippedCount,
      conflicts: conflictCount,
      acceptedAmountPaise: acceptedTransactions.reduce((total, item) => total + Number(item.amount_paise || 0), 0),
    }

    setImportSummary(summary)

    if (acceptedTransactions.length === 0) {
      setStatusMessage('No eligible import rows were accepted.')
      return
    }

    const batch = {
      batch_id: uuid(),
      file_name: preview.fileName,
      function_id: functionId,
      source_device_id: payload.source_device_id,
      imported_at: new Date().toISOString(),
      imported_count: acceptedTransactions.length,
      skipped_count: skippedCount,
      conflict_count: conflictCount,
      notes: 'Imported via offline JSON merge.',
    }
    const importedPersons = payload.persons || []

    try {
      await executeBulkWrite((dbTx) => {
        const transactionStore = dbTx.objectStore('gift_transactions')
        const personStore = dbTx.objectStore('persons')
        const batchStore = dbTx.objectStore('import_batches')

        acceptedTransactions.forEach((transaction) => {
          transactionStore.put(transaction)
        })

        importedPersons.forEach((person) => {
          personStore.put(person)
        })

        batchStore.put(batch)
      })

      setTransactions((current) => [...acceptedTransactions, ...current])
      setPersons((current) => {
        const existingIds = new Set(current.map((person) => person.person_id))
        return [...current, ...importedPersons.filter((person) => !existingIds.has(person.person_id))]
      })
      setStatusMessage(`Import completed for ${summary.newTransactions} new records.`)
    } catch (error) {
      setStatusMessage(error.message || 'Unable to apply this import.')
    }
  }

  const totalValidAmount = formatCompactAmount(validFunctionTotal)

  if (!dbReady) {
    return <div className="app-shell"><div className="loading-box">Loading offline ledger…</div></div>
  }

  if (dbError) {
    return <div className="app-shell"><div className="error-box">{dbError}</div></div>
  }

  if (!selectedUserId) {
    return (
      <div className="app-shell auth-shell">
        <div className="auth-card">
          <h1>VizhaMate</h1>
          <p>
            This is a frontend-only application. Anyone with access to the local browser data can inspect or bypass the role restrictions.
          </p>
          <form onSubmit={handleCreateProfile}>
            <label htmlFor="profile-name">Local profile name</label>
            <input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Enter user name" />
            <label htmlFor="profile-role">Role</label>
            <select id="profile-role" value={profileRole} onChange={(event) => setProfileRole(event.target.value)}>
              <option value="Admin">Admin</option>
              <option value="Recorder">Recorder</option>
            </select>
            <button type="submit">Continue</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      {isMobileLayout && sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside
        className={`sidebar ${sidebarOpen ? 'sidebar-is-open' : ''}`}
        aria-hidden={isMobileLayout && !sidebarOpen}
        inert={isMobileLayout && !sidebarOpen}
      >
        <div className="brand-block">
          <div className="brand-heading">
            <div>
              <h2>VizhaMate</h2>
              <span>Gift Ledger</span>
            </div>
            <button
              className="drawer-close"
              type="button"
              aria-label="Close navigation"
              onClick={() => setSidebarOpen(false)}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
        <nav className="nav-list">
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item]
            const label = item.replace('-', ' ')

            return (
              <button
                key={item}
                type="button"
                className={activeTab === item ? 'nav-item active' : 'nav-item'}
                aria-label={label}
                aria-current={activeTab === item ? 'page' : undefined}
                title={label}
                onClick={() => {
                  setActiveTab(item)
                  if (isMobileLayout) setSidebarOpen(false)
                }}
              >
                <Icon className="nav-icon" aria-hidden="true" />
                <span className="nav-label">{label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-summary">
          <strong>{selectedUser?.name || 'User'}</strong>
          <small>{selectedUser?.role || 'Recorder'}</small>
        </div>
      </aside>

      <main className="content-area">
        <header className="topbar">
          <div className="topbar-main">
            {!sidebarOpen && (
              <button
                className="menu-toggle"
                type="button"
                aria-label="Expand navigation"
                aria-expanded={false}
                onClick={() => setSidebarOpen(true)}
              >
                <span aria-hidden="true">☰</span>
              </button>
            )}
            <div>
              <p className="eyebrow">Selected function</p>
              <h1>{selectedFunction?.name || 'Choose a function'}</h1>
            </div>
          </div>
        </header>

        {statusMessage && (
          <div className="toast-region" aria-live="polite" aria-atomic="true">
            <output className="toast-message">
              <span>{statusMessage}</span>
              <button type="button" className="toast-dismiss" aria-label="Dismiss notification" onClick={() => setStatusMessage('')}>
                <X aria-hidden="true" />
              </button>
            </output>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <section className="page-section">
            <div className="stats-grid">
              <div className="stat-card accent">
                <span className="stat-label">Total valid gift amount</span>
                <strong>{totalValidAmount}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total valid transactions</span>
                <strong>{dashboardStats.validTx}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Confirmed guests</span>
                <strong>{dashboardStats.guests}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Voided entries</span>
                <strong>{dashboardStats.voided}</strong>
              </div>
            </div>

            <div className="panel-grid two-columns">
              <div className="panel">
                <h3>Recorder totals</h3>
                <ul className="mini-list">
                  {Object.entries(dashboardStats.recorderTotals).map(([name, total]) => (
                    <li key={name}><span>{name}</span><strong>{formatAmount(total)}</strong></li>
                  ))}
                </ul>
              </div>

              <div className="panel">
                <h3>Selected function</h3>
                <ul className="mini-list">
                  <li><span>Function</span><strong>{selectedFunction?.name || 'Not selected'}</strong></li>
                  <li><span>Date</span><strong>{formatFunctionDate(selectedFunction?.function_date)}</strong></li>
                  <li><span>Location</span><strong>{selectedFunction?.location || '—'}</strong></li>
                  <li><span>Amount collected</span><strong>{formatAmount(validFunctionTotal)}</strong></li>
                  <li><span>Potential duplicates</span><strong>{dashboardStats.duplicates}</strong></li>
                </ul>
              </div>
            </div>
          </section>
        )}
        <div className="panel entry-context-panel">
          <div className="section-heading">
            <h3>Record this gift under</h3>
            <span>The choices are stored with each entry</span>
          </div>
          <div className="entry-context-controls">
            <div className="entry-context-field function-context-field">
              <label htmlFor="entry-function">Function</label>
              <select
                id="entry-function"
                value={selectedFunctionId}
                onChange={(event) => {
                  setSelectedFunctionId(event.target.value)
                  setEntryForm(emptyGuestForm)
                }}
              >
                <option value="">Choose a function</option>
                {functions.map((fn) => <option key={fn.function_id} value={fn.function_id}>{fn.name}</option>)}
              </select>
              <button type="button" className="secondary-button" onClick={() => {
                setEditingFunctionId('')
                setFunctionForm(emptyFunctionForm)
                setActiveTab('functions')
              }}>Add function</button>
            </div>
            <div className="entry-context-field recorder-context-field">
              <label htmlFor="entry-recorder">Recorder</label>
              <select id="entry-recorder" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                <option value="">Choose a recorder</option>
                {users.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} · {user.role || 'Recorder'}</option>)}
              </select>
            </div>
          </div>
          <p className="workspace-assurance">Gifts in the list below belong to the selected function.</p>
        </div>

        {activeTab === 'functions' && (
          <FunctionsPage
            functions={functions}
            editingFunctionId={editingFunctionId}
            functionForm={functionForm}
            onFunctionFormChange={setFunctionForm}
            onSubmit={handleCreateFunction}
            onCancelEdit={() => {
              setEditingFunctionId('')
              setFunctionForm(emptyFunctionForm)
            }}
            onUseFunction={(fn) => {
              setSelectedFunctionId(fn.function_id)
              setActiveTab('entry')
            }}
            onEditFunction={handleEditFunction}
            onDeleteFunction={(fn) => void handleDeleteFunction(fn)}
          />
        )}

        {activeTab === 'users' && (
          <UsersPage
            users={users}
            selectedUserId={selectedUserId}
            editingUserId={editingUserId}
            profileName={profileName}
            profileRole={profileRole}
            transactions={transactions}
            onSelectUser={setSelectedUserId}
            onProfileNameChange={setProfileName}
            onProfileRoleChange={setProfileRole}
            onSubmit={handleCreateProfile}
            onCancelEdit={() => {
              setEditingUserId('')
              setProfileName('')
              setProfileRole('Recorder')
            }}
            onEditUser={handleEditUser}
            onDeleteUser={(user) => void handleDeleteUser(user)}
          />
        )}

        {activeTab === 'entry' && (
          <GiftEntryPage
            selectedFunction={selectedFunction}
            selectedFunctionId={selectedFunctionId}
            selectedUserId={selectedUserId}
            entryForm={entryForm}
            setEntryForm={setEntryForm}
            nameInputRef={nameInputRef}
            suggestionList={suggestionList}
            denominationTotalPaise={denominationTotalPaise}
            saving={saving}
            onSave={handleSaveTransaction}
            functionTransactions={functionTransactions}
            recentFunctionTransactions={recentFunctionTransactions}
            persons={persons}
          />
        )}

        {activeTab === 'transactions' && (
          <section className="page-section">
            <div className="toolbar">
              <input placeholder="Search guest name" value={transactionFilter.search} onChange={(event) => setTransactionFilter((current) => ({ ...current, search: event.target.value }))} />
              <select value={transactionFilter.status} onChange={(event) => setTransactionFilter((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All statuses</option>
                <option value="valid">Valid</option>
                <option value="voided">Voided</option>
              </select>
              <select value={transactionFilter.recorder} onChange={(event) => setTransactionFilter((current) => ({ ...current, recorder: event.target.value }))}>
                <option value="all">All recorders</option>
                {users.map((user) => <option key={user.user_id} value={user.user_id}>{user.name}</option>)}
              </select>
            </div>
            <TransactionTable
              transactions={visibleTransactions}
              persons={persons}
              users={users}
              isAdmin={isAdmin}
              onCorrect={handleCorrectTransaction}
              onVoid={handleVoidTransaction}
            />
          </section>
        )}

        {activeTab === 'guests' && (
          <section className="page-section">
            <div className="panel-grid two-columns">
              <div className="panel">
                <h3>Guest list</h3>
                <ul className="list-block">
                  {persons.map((person) => (
                    <li key={person.person_id}>
                      <div>
                        <strong>{person.full_name}</strong>
                        <small>
                          {[person.street, person.area || person.village, person.city, person.district, person.state, person.pincode].filter(Boolean).join(', ') || 'No location'}
                          {person.relationship ? ` · ${person.relationship}` : ''}
                          {person.occupation ? ` · ${person.occupation}` : ''}
                          {person.phone_number ? ` · ${person.phone_number}` : ''}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel">
                <h3>Guest contribution history</h3>
                <ul className="mini-list">
                  {transactions.length === 0 && <li><span>No records</span></li>}
                  {transactions.filter((item) => item.function_id === selectedFunctionId).map((item) => {
                    const guest = persons.find((person) => person.person_id === item.person_id)
                    return (
                      <li key={item.transaction_id}><span>{guest?.full_name || 'Unknown'}</span><strong>{formatAmount(item.amount_paise)}</strong></li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'duplicates' && (
          <section className="page-section">
            <div className="panel">
              <h3>Possible duplicate review</h3>
              {functionTransactions.filter((transaction) => {
                const sameAmountMatches = functionTransactions.filter(
                  (item) => item.person_id === transaction.person_id && item.amount_paise === transaction.amount_paise && item.transaction_id !== transaction.transaction_id && item.status === 'valid'
                )
                return sameAmountMatches.length > 0 && transaction.status === 'valid'
              }).map((transaction) => {
                const guest = persons.find((person) => person.person_id === transaction.person_id)
                return (
                  <div key={transaction.transaction_id} className="duplicate-card">
                    <div>
                      <strong>{guest?.full_name || 'Guest'}</strong>
                      <p>Possible duplicate amount: {formatAmount(transaction.amount_paise)}</p>
                    </div>
                    {isAdmin && <button type="button" onClick={() => handleVoidTransaction(transaction.transaction_id, 'Reviewed as duplicate')}>Void after review</button>}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {activeTab === 'corrections' && (
          <section className="page-section">
            <div className="panel">
              <h3>Audit history</h3>
              <ul className="list-block compact">
                {audits.length === 0 && <li>No audit history yet.</li>}
                {audits.map((audit) => (
                  <li key={audit.audit_id}>
                    <div>
                      <strong>{audit.action}</strong>
                      <small>{audit.reason || 'No reason provided'}</small>
                    </div>
                    <span>{audit.old_value} → {audit.new_value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {activeTab === 'import-export' && (
          <section className="page-section">
            <div className="panel-grid two-columns">
              <div className="panel">
                <h3>Export current function</h3>
                <button type="button" onClick={handleExportFunction}>Download JSON export</button>
              </div>
              <div className="panel">
                <h3>Import JSON files</h3>
                <input type="file" multiple accept="application/json" onChange={handleImportFiles} />
                {importPreview.length > 0 && (
                  <div className="import-list">
                    {importPreview.map((entry) => (
                      <div key={entry.fileName} className={entry.valid ? 'import-item valid' : 'import-item invalid'}>
                        <strong>{entry.fileName}</strong>
                        {entry.valid ? <span>Ready</span> : <span>Rejected</span>}
                        {entry.errors.length > 0 && <small>{entry.errors.join(', ')}</small>}
                        {entry.valid && (
                          <button type="button" onClick={() => handleApplyImport(entry)}>Import this file</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {importSummary && (
              <div className="panel summary-box">
                <h3>Import summary</h3>
                <ul className="mini-list">
                  <li><span>File</span><strong>{importSummary.fileName}</strong></li>
                  <li><span>New transactions</span><strong>{importSummary.newTransactions}</strong></li>
                  <li><span>Skipped duplicate IDs</span><strong>{importSummary.skippedDuplicates}</strong></li>
                  <li><span>Conflicts</span><strong>{importSummary.conflicts}</strong></li>
                  <li><span>Accepted amount</span><strong>{formatAmount(importSummary.acceptedAmountPaise)}</strong></li>
                </ul>
              </div>
            )}
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="page-section">
            <div className="panel">
              <h3>Settings and backup</h3>
              <p>IndexedDB is used for the real financial records, and browser storage is not guaranteed forever. Please export JSON backups regularly.</p>
              <button type="button" onClick={async () => {
                const payload = {
                  export_version: 1,
                  exported_at: new Date().toISOString(),
                  source_device_id: deviceId,
                  functions: functions,
                  persons,
                  users,
                  transactions,
                  audits,
                }
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'vizhamate-full-backup.json'
                link.click()
                URL.revokeObjectURL(url)
                setStatusMessage('Full database backup has been downloaded.')
              }}>Download full backup</button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
