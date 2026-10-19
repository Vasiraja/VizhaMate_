import { ArrowRight, Pencil, Trash2 } from 'lucide-react'
import TamilAddressFields from './TamilAddressFields'

const FUNCTION_TYPES = ['Marriage', 'Engagement', 'Ear Piercing', 'Birthday', 'Other']

export function FunctionsPage({
    functions,
    editingFunctionId,
    functionForm,
    onFunctionFormChange,
    onSubmit,
    onCancelEdit,
    onUseFunction,
    onEditFunction,
    onDeleteFunction,
}) {
    return (
        <section className="page-section">
            <div className="panel-grid two-columns">
                <div className="panel">
                    <h3>{editingFunctionId ? 'Edit function' : 'Create function'}</h3>
                    <form className="stack-form" onSubmit={onSubmit}>
                        <input placeholder="Function name" value={functionForm.name} onChange={(event) => onFunctionFormChange((current) => ({ ...current, name: event.target.value }))} />
                        <select value={functionForm.function_type} onChange={(event) => onFunctionFormChange((current) => ({ ...current, function_type: event.target.value }))}>
                            {FUNCTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <input placeholder="Host / family name" value={functionForm.host_name} onChange={(event) => onFunctionFormChange((current) => ({ ...current, host_name: event.target.value }))} />
                        <input type="date" value={functionForm.function_date} onChange={(event) => onFunctionFormChange((current) => ({ ...current, function_date: event.target.value }))} />
                        <TamilAddressFields idPrefix="function-address" address={functionForm} onChange={onFunctionFormChange} />
                        <div className="form-actions">
                            <button type="submit">{editingFunctionId ? 'Save changes' : 'Create function'}</button>
                            {editingFunctionId && (
                                <button type="button" className="secondary-button" onClick={onCancelEdit}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="panel">
                    <h3>Available functions</h3>
                    <ul className="list-block">
                        {functions.length === 0 && <li>No functions created yet.</li>}
                        {functions.map((fn) => (
                            <li key={fn.function_id}>
                                <div>
                                    <strong>{fn.name}</strong>
                                    <small>{fn.function_type} • {fn.location}</small>
                                </div>
                                <div className="management-actions function-management-actions">
                                    <button type="button" aria-label={`Use ${fn.name}`} title="Use function" onClick={() => onUseFunction(fn)}>
                                        <ArrowRight aria-hidden="true" />
                                    </button>
                                    <button type="button" className="secondary-button" aria-label={`Edit ${fn.name}`} title="Edit function" onClick={() => onEditFunction(fn)}>
                                        <Pencil aria-hidden="true" />
                                    </button>
                                    <button type="button" className="danger" aria-label={`Delete ${fn.name}`} title="Delete function" onClick={() => onDeleteFunction(fn)}>
                                        <Trash2 aria-hidden="true" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}

export function UsersPage({
    users,
    selectedUserId,
    editingUserId,
    profileName,
    profileRole,
    transactions,
    onSelectUser,
    onProfileNameChange,
    onProfileRoleChange,
    onSubmit,
    onCancelEdit,
    onEditUser,
    onDeleteUser,
}) {
    return (
        <section className="page-section">
            <div className="panel active-recorder-panel">
                <h3>Recorder for new entries</h3>
                <p>This profile will be recorded on every new gift until changed.</p>
                <label htmlFor="active-recorder">Active recorder</label>
                <select id="active-recorder" value={selectedUserId} onChange={(event) => onSelectUser(event.target.value)}>
                    <option value="">Choose a user</option>
                    {users.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} · {user.role || 'Recorder'}</option>)}
                </select>
            </div>

            <div className="panel-grid two-columns">
                <div className="panel">
                    <h3>{editingUserId ? 'Edit user profile' : 'Add user profile'}</h3>
                    <form className="stack-form" onSubmit={onSubmit}>
                        <label htmlFor="managed-profile-name">Name</label>
                        <input id="managed-profile-name" value={profileName} onChange={(event) => onProfileNameChange(event.target.value)} placeholder="Enter user name" />
                        <label htmlFor="managed-profile-role">Role</label>
                        <select id="managed-profile-role" value={profileRole} onChange={(event) => onProfileRoleChange(event.target.value)}>
                            <option value="Admin">Admin</option>
                            <option value="Recorder">Recorder</option>
                        </select>
                        <div className="form-actions">
                            <button type="submit">{editingUserId ? 'Save changes' : 'Add user'}</button>
                            {editingUserId && (
                                <button type="button" className="secondary-button" onClick={onCancelEdit}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="panel">
                    <h3>Users and recorder history</h3>
                    <ul className="list-block">
                        {users.map((user) => {
                            const giftCount = transactions.filter((transaction) => transaction.recorder_id === user.user_id).length

                            return (
                                <li key={user.user_id}>
                                    <div>
                                        <strong>{user.name}{selectedUserId === user.user_id ? ' · Selected' : ''}</strong>
                                        <small>{user.role || 'Recorder'} · {giftCount} recorded gift{giftCount === 1 ? '' : 's'}</small>
                                    </div>
                                    <div className="management-actions">
                                        <button type="button" className="secondary-button" onClick={() => onEditUser(user)}>Edit</button>
                                        <button type="button" className="danger" onClick={() => onDeleteUser(user)}>Delete</button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
        </section>
    )
}