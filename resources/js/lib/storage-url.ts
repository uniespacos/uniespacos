const EMBEDDED_URL = /^(data|blob):/i;
const ABSOLUTE_HTTP_URL = /^(https?:\/\/[^/?#]*)([^?#]*)(.*)$/i;
const STORAGE_PREFIX = /^storage(?:\/|$)/;

const collapseSlashes = (value: string) => value.replace(/\/{2,}/g, '/');

export function resolveStorageUrl(path: string | null | undefined): string | undefined {
    if (typeof path !== 'string') return undefined;

    const value = path.trim();
    if (value === '') return undefined;
    if (EMBEDDED_URL.test(value)) return value;

    const absolute = ABSOLUTE_HTTP_URL.exec(value);
    if (absolute) {
        const [, origin = '', pathname = '', suffix = ''] = absolute;
        return `${origin}${collapseSlashes(pathname)}${suffix}`;
    }

    const relative = collapseSlashes(value).replace(/^\/+/, '').replace(STORAGE_PREFIX, '');
    return `/storage/${relative}`;
}
