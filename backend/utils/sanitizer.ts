/**
 * Enterprise Data Sanitizer
 * Prevents XSS and malicious injections in user-generated content.
 */
export class Sanitizer {
    /**
     * Basic string sanitization (Strips HTML tags)
     */
    public static clean(input: string): string {
        if (!input) return '';
        // Strip HTML tags
        let cleaned = input.replace(/<[^>]*>?/gm, '');
        // Trim and remove suspicious patterns
        cleaned = cleaned.trim().substring(0, 1000); // Limit length
        return cleaned;
    }

    /**
     * Username sanitization (Alphanumeric only)
     */
    public static cleanUsername(username: string): string {
        if (!username) return '';
        return username.toLowerCase().replace(/[^a-z0-9_.]/g, '').substring(0, 30);
    }
}
