import React, { useEffect, useRef } from 'react';
import { BACKEND_URL } from '@utils/apiConfig';

/**
 * ConnectivityGuard — keeps the Render backend alive with periodic pings
 * and does NOT block the UI when backend is slow/sleeping.
 * Render free tier sleeps after 15min — we ping every 10min to prevent it.
 */
export const ConnectivityGuard: React.FC = () => {
    const failCountRef = useRef(0);

    useEffect(() => {
        const ping = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/health`, {
                    cache: 'no-store',
                    signal: AbortSignal.timeout(10000),
                });
                if (res.ok) {
                    failCountRef.current = 0;
                } else {
                    failCountRef.current++;
                }
            } catch {
                failCountRef.current++;
            }
        };

        // Initial ping
        ping();

        // Ping every 10 minutes to keep Render awake
        const interval = setInterval(ping, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Never block the UI — just keep the backend warm
    return null;
};
