/**
 * Normalizes artist names to a standard sentence case while preserving 
 * common acronyms or specifically styled names.
 */
export function normalizeArtistName(name: string): string {
    if (!name) return '';
    
    // List of names that should stay as they are (all caps or special)
    const preservedNames = ['DJO', 'GIMS', 'AC/DC', 'ABBA', 'R.E.M.', 'MGMT', 'ASAP', 'JAY-Z'];
    
    const upperName = name.trim().toUpperCase();
    if (preservedNames.includes(upperName)) return upperName;

    // If it's all caps and longer than 3 letters, normalize it
    if (name === upperName && name.length > 3) {
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    return name;
}
export function toSentenceCase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatNumber(num: number): string {
    if (!num || isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
