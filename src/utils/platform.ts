/**
 * Platform awareness utility for SoundVzn.
 * Handles the differences between Electron and Web environments.
 */

export const isElectron = () => {
    return !!(window as any).electron;
};

export const openExternalUrl = (url: string) => {
    if (isElectron()) {
        (window as any).electron.openExternal(url);
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};

export const getElectronApi = () => {
    return (window as any).electron;
};

/**
 * Universal method to save persistent data.
 * Uses Electron's store in Desktop, and localStorage in Web.
 */
export const savePersistentData = async (key: string, data: any) => {
    if (isElectron()) {
        return await getElectronApi().saveData(key, data);
    } else {
        localStorage.setItem(`svzn_pers_${key}`, JSON.stringify(data));
        return true;
    }
};

/**
 * Universal method to load persistent data.
 */
export const loadPersistentData = async (key: string) => {
    if (isElectron()) {
        return await getElectronApi().loadData(key);
    } else {
        const data = localStorage.getItem(`svzn_pers_${key}`);
        return data ? JSON.parse(data) : null;
    }
};
