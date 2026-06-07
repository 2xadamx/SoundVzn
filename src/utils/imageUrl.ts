/** Evita data-URLs truncadas o corruptas que provocan ERR_INVALID_URL en el navegador. */
export function safeImageSrc(src?: string | null, fallback?: string): string | undefined {
    if (!src || typeof src !== 'string') return fallback;
    const trimmed = src.trim();
    if (!trimmed) return fallback;

    if (trimmed.startsWith('data:')) {
        const comma = trimmed.indexOf(',');
        if (comma < 1) return fallback;
        const payload = trimmed.slice(comma + 1);
        if (payload.length < 128) return fallback;
        if (trimmed.length > 2_000_000) return fallback;
    }

    return trimmed;
}

export function sanitizeUserAvatar<T extends { avatar?: string | null; banner?: string | null }>(user: T): T {
    let updated: T = user;
    if (user?.avatar) {
        const safeAvatar = safeImageSrc(user.avatar);
        if (safeAvatar !== user.avatar) {
            updated = { ...updated, avatar: safeAvatar };
        }
    }
    if (user?.banner) {
        const safeBanner = safeImageSrc(user.banner);
        if (safeBanner !== user.banner) {
            updated = { ...updated, banner: safeBanner };
        }
    }
    return updated;
}
