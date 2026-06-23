/**
 * @jest-environment jsdom
 */

import 'whatwg-fetch';
import { renderHook, act } from '@testing-library/react';
import { useWallet, fetchWalletData } from '../hooks/useWallet';

const mockBalance = '100.50';
const mockPublicKey = 'GABCDEF1234567890';
const validResponse = { balance: mockBalance, publicKey: mockPublicKey };

function mockFetchOnce(data: unknown, status = 200) {
    return jest.spyOn(globalThis, 'fetch').mockImplementationOnce(
        () => Promise.resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: status === 404 ? 'Not Found' : 'Error',
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(
                typeof data === 'string' ? data : JSON.stringify(data),
            ),
        } as Response),
    );
}

describe('fetchWalletData', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return wallet data on success', async () => {
        mockFetchOnce(validResponse);
        const result = await fetchWalletData();
        expect(result).toEqual(validResponse);
    });

    it('should throw on non-ok response', async () => {
        mockFetchOnce({ error: 'Not found' }, 404);
        await expect(fetchWalletData()).rejects.toThrow('{"error":"Not found"}');
    });

    it('should throw on malformed response', async () => {
        mockFetchOnce({ unexpected: 'shape' });
        await expect(fetchWalletData()).rejects.toThrow('Invalid wallet response format');
    });

    it('should throw on network error', async () => {
        jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network failure'));
        await expect(fetchWalletData()).rejects.toThrow('Network failure');
    });

    it('should abort on signal', async () => {
        const controller = new AbortController();
        const promise = fetchWalletData(controller.signal);
        controller.abort();
        await expect(promise).rejects.toThrow('Aborted');
    });
});

describe('useWallet', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should start fetching immediately on mount', () => {
        mockFetchOnce(validResponse);

        const { result } = renderHook(() => useWallet());

        expect(result.current.status).toBe('loading');
        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();
    });

    it('should transition to loading then success on mount', async () => {
        mockFetchOnce(validResponse);

        const { result } = renderHook(() => useWallet());

        expect(result.current.status).toBe('loading');

        await act(async () => {
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual(validResponse);
        expect(result.current.error).toBeNull();
    });

    it('should transition to error on fetch failure', async () => {
        mockFetchOnce('Internal error', 500);

        const { result } = renderHook(() => useWallet());

        await act(async () => {
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(result.current.status).toBe('error');
        expect(result.current.data).toBeNull();
        expect(result.current.error).toContain('Internal error');
    });

    it('should reset state on reset() call', async () => {
        mockFetchOnce(validResponse);

        const { result } = renderHook(() => useWallet());

        await act(async () => {
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(result.current.status).toBe('success');

        act(() => {
            result.current.reset();
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();
    });

    it('should not update state after unmount', async () => {
        jest.useFakeTimers();
        let resolvePromise: (v: unknown) => void;
        const fetchPromise = new Promise((resolve) => {
            resolvePromise = resolve;
        });

        jest.spyOn(globalThis, 'fetch').mockReturnValueOnce(fetchPromise as Promise<Response>);

        const { result, unmount } = renderHook(() => useWallet());

        unmount();

        await act(async () => {
            resolvePromise!({
                ok: true,
                status: 200,
                json: () => Promise.resolve(validResponse),
                text: () => Promise.resolve(''),
            } as Response);
        });

        expect(result.current.status).toBe('loading');
        jest.useRealTimers();
    });

    it('should clean up AbortController on unmount', () => {
        const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

        mockFetchOnce(validResponse);

        const { unmount } = renderHook(() => useWallet());

        unmount();

        expect(abortSpy).toHaveBeenCalled();
        abortSpy.mockRestore();
    });
});
