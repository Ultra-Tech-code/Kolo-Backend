import { useEffect, useReducer, useCallback } from 'react';

export interface WalletData {
    balance: string;
    publicKey: string;
}

export interface WalletState {
    status: 'idle' | 'loading' | 'success' | 'error';
    data: WalletData | null;
    error: string | null;
}

type WalletAction =
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: WalletData }
    | { type: 'FETCH_ERROR'; payload: string }
    | { type: 'RESET' };

const initialState: WalletState = {
    status: 'idle',
    data: null,
    error: null,
};

function walletReducer(state: WalletState, action: WalletAction): WalletState {
    switch (action.type) {
        case 'FETCH_START':
            return { status: 'loading', data: null, error: null };
        case 'FETCH_SUCCESS':
            return { status: 'success', data: action.payload, error: null };
        case 'FETCH_ERROR':
            return { status: 'error', data: null, error: action.payload };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

async function fetchWalletData(signal?: AbortSignal): Promise<WalletData> {
    const response = await fetch('/api/wallet', { signal });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(body || `HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    if (!json || typeof json.balance !== 'string' || typeof json.publicKey !== 'string') {
        throw new Error('Invalid wallet response format');
    }

    return { balance: json.balance, publicKey: json.publicKey };
}

export function useWallet() {
    const [state, dispatch] = useReducer(walletReducer, initialState);

    const fetchWallet = useCallback(async (signal?: AbortSignal) => {
        dispatch({ type: 'FETCH_START' });
        try {
            const data = await fetchWalletData(signal);
            dispatch({ type: 'FETCH_SUCCESS', payload: data });
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            const message = err instanceof Error ? err.message : 'Unknown error';
            dispatch({ type: 'FETCH_ERROR', payload: message });
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        fetchWallet(controller.signal);

        return () => controller.abort();
    }, [fetchWallet]);

    const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

    const refetch = useCallback(() => {
        const controller = new AbortController();
        fetchWallet(controller.signal);
        return () => controller.abort();
    }, [fetchWallet]);

    return { ...state, reset, refetch } as const;
}

export { fetchWalletData };
