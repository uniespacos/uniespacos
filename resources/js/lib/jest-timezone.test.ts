// Garante que o globalSetup (jest.global-setup.js) fixou o fuso da suíte em America/Bahia (UTC-03, sem horário de verão).
// Sem isso, o resultado dos testes dependeria da máquina: o CI roda em UTC e o ambiente local, em America/Bahia.
describe('fuso horario da suite', () => {
    it('usa America/Bahia (UTC-03) independentemente do fuso da maquina', () => {
        expect(new Date().getTimezoneOffset()).toBe(180);
        expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(180);
        expect(new Date(2026, 6, 1).getTimezoneOffset()).toBe(180);
        expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Bahia');
    });

    it('interpreta datas ISO sem hora como meia-noite UTC (21h do dia anterior em UTC-03)', () => {
        const data = new Date('2026-06-03');
        expect(data.getDate()).toBe(2);
        expect(data.getHours()).toBe(21);
    });
});
