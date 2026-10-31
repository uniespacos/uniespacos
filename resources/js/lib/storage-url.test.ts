import { resolveStorageUrl } from './storage-url';

describe('resolveStorageUrl', () => {
    it.each([null, undefined, '', '   '])('retorna undefined para valor vazio (%p)', (valor) => {
        expect(resolveStorageUrl(valor)).toBeUndefined();
    });

    it.each(['data:image/png;base64,AAAA', 'blob:https://localhost/3f2a-uuid'])('preserva %s intacto', (valor) => {
        expect(resolveStorageUrl(valor)).toBe(valor);
    });

    it('colapsa barras repetidas em URL absoluta preservando o https://', () => {
        expect(resolveStorageUrl('https://localhost//storage/a.jpg')).toBe('https://localhost/storage/a.jpg');
    });

    it('mantém URL absoluta sem barras repetidas inalterada', () => {
        expect(resolveStorageUrl('https://localhost/storage/a.jpg')).toBe('https://localhost/storage/a.jpg');
    });

    it('não altera a origem de URL absoluta externa', () => {
        expect(resolveStorageUrl('https://example.com/avatar.jpg')).toBe('https://example.com/avatar.jpg');
    });

    it('preserva a query string de URL absoluta sem colapsar barras nela', () => {
        expect(resolveStorageUrl('http://localhost//storage/a.jpg?v=1//2')).toBe('http://localhost/storage/a.jpg?v=1//2');
    });

    it('prefixa caminho relativo com /storage/', () => {
        expect(resolveStorageUrl('avatars/a.jpg')).toBe('/storage/avatars/a.jpg');
    });

    it('não duplica /storage/ quando já presente com barra inicial', () => {
        expect(resolveStorageUrl('/storage/a.jpg')).toBe('/storage/a.jpg');
    });

    it('não duplica /storage/ quando já presente sem barra inicial', () => {
        expect(resolveStorageUrl('storage/a.jpg')).toBe('/storage/a.jpg');
    });

    it('normaliza barras iniciais extras em caminho relativo', () => {
        expect(resolveStorageUrl('//avatars//a.jpg')).toBe('/storage/avatars/a.jpg');
    });

    it('não confunde nome de pasta que começa com storage', () => {
        expect(resolveStorageUrl('storagedata/a.jpg')).toBe('/storage/storagedata/a.jpg');
    });
});
