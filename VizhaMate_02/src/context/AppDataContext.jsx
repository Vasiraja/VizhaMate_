import { useCallback, useEffect, useState } from 'react';
import AppDataContext from './AppDataContext.js';
import { getAll } from '../db/database.js';

export function AppDataProvider({ children }) {
    const [data, setData] = useState({
        functions: [], persons: [], users: [], devices: [], transactions: [],
        audits: [], imports: [], correctionRequests: [], aliases: [],
    });
    const [loading, setLoading] = useState(true);
    const [storageError, setStorageError] = useState('');
    const [activeUserId, setActiveUserId] = useState(() => localStorage.getItem('vizha-user-id') || '');
    const [selectedFunctionId, setSelectedFunctionId] = useState(() => localStorage.getItem('vizha-function-id') || '');

    const refresh = useCallback(async () => {
        try {
            const [functions, persons, users, devices, transactions, audits, imports, correctionRequests, aliases] = await Promise.all([
                getAll('functions'), getAll('persons'), getAll('app_users'), getAll('devices'),
                getAll('gift_transactions'), getAll('transaction_audit'), getAll('import_batches'),
                getAll('correction_requests'), getAll('person_aliases'),
            ]);
            setData({ functions, persons, users, devices, transactions, audits, imports, correctionRequests, aliases });
            setStorageError('');
        } catch (error) {
            setStorageError(error.message || 'Local storage could not be opened.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        navigator.storage?.persist?.().catch(() => { });
        const update = () => refresh();
        window.addEventListener('vizha-data-changed', update);
        return () => window.removeEventListener('vizha-data-changed', update);
    }, [refresh]);

    function chooseUser(userId) {
        localStorage.setItem('vizha-user-id', userId);
        setActiveUserId(userId);
    }

    function chooseFunction(functionId) {
        localStorage.setItem('vizha-function-id', functionId);
        setSelectedFunctionId(functionId);
    }

    const activeUser = data.users.find((user) => user.user_id === activeUserId) || null;
    const activeFunction = data.functions.find((item) => item.function_id === selectedFunctionId) || data.functions[0] || null;

    return (
        <AppDataContext.Provider value={{
            ...data, loading, storageError, refresh, activeUser, activeUserId,
            chooseUser, activeFunction, selectedFunctionId: activeFunction?.function_id || '', chooseFunction,
        }}>
            {children}
        </AppDataContext.Provider>
    );
}