import { useEffect } from 'react';

export const DayNightIllumination = () => {
    useEffect(() => {
        const updateTimeOfDay = () => {
            const hour = new Date().getHours();
            let envTime = 'night';

            if (hour >= 6 && hour < 11) {
                envTime = 'dawn';
            } else if (hour >= 11 && hour < 17) {
                envTime = 'day';
            } else if (hour >= 17 && hour < 20) {
                envTime = 'dusk';
            } else {
                envTime = 'night';
            }

            document.documentElement.setAttribute('data-env-time', envTime);
        };

        // Run immediately
        updateTimeOfDay();

        // Update every 10 minutes
        const interval = setInterval(updateTimeOfDay, 1000 * 60 * 10);

        return () => clearInterval(interval);
    }, []);

    return null; // Logic only node
};
