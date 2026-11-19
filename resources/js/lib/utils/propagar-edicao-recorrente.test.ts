import { propagarEdicaoRecorrente, type SlotPayloadRecorrencia } from './propagar-edicao-recorrente';

const AGENDA_MANHA = 2;
const AGENDA_TARDE = 3;

const MANHA = { horario_inicio: '07:30:00', horario_fim: '08:20:00' };
const TARDE = { horario_inicio: '13:10:00', horario_fim: '14:00:00' };

const T1 = '2026-11-24';
const T2 = '2026-12-01';
const T3 = '2026-12-08';

const INICIO_PERIODO = new Date(2026, 10, 24);
const FIM_PERIODO = new Date(2026, 11, 8);
const HOJE_ANTES_DO_PERIODO = new Date(2026, 10, 19);

function slot(data: string, agenda_id: number, horario: typeof MANHA): SlotPayloadRecorrencia {
    return { data, agenda_id, ...horario };
}

function resumir(slots: SlotPayloadRecorrencia[]) {
    return slots.map((s) => `${s.data}|${String(s.agenda_id)}|${s.horario_inicio}`).sort();
}

describe('propagarEdicaoRecorrente', () => {
    it('propaga a troca de turno de uma semana para as demais ocorrencias (E-01)', () => {
        const iniciais = [slot(T1, AGENDA_MANHA, MANHA), slot(T2, AGENDA_MANHA, MANHA), slot(T3, AGENDA_MANHA, MANHA)];
        const atuais = [slot(T1, AGENDA_TARDE, TARDE), slot(T2, AGENDA_MANHA, MANHA), slot(T3, AGENDA_MANHA, MANHA)];

        const resultado = propagarEdicaoRecorrente({
            iniciais,
            atuais,
            dataInicial: INICIO_PERIODO,
            dataFinal: FIM_PERIODO,
            hoje: HOJE_ANTES_DO_PERIODO,
        });

        expect(resultado.filter((s) => s.agenda_id === AGENDA_TARDE)).toHaveLength(3);
        expect(resultado.filter((s) => s.agenda_id === AGENDA_MANHA)).toHaveLength(0);
        expect(resumir(resultado)).toEqual([`${T1}|3|13:10:00`, `${T2}|3|13:10:00`, `${T3}|3|13:10:00`]);
    });

    it('propaga a remocao de um horario para as demais ocorrencias do mesmo dia da semana', () => {
        const iniciais = [slot(T1, AGENDA_MANHA, MANHA), slot(T2, AGENDA_MANHA, MANHA), slot(T3, AGENDA_MANHA, MANHA)];
        const atuais = [slot(T2, AGENDA_MANHA, MANHA), slot(T3, AGENDA_MANHA, MANHA)];

        const resultado = propagarEdicaoRecorrente({
            iniciais,
            atuais,
            dataInicial: INICIO_PERIODO,
            dataFinal: FIM_PERIODO,
            hoje: HOJE_ANTES_DO_PERIODO,
        });

        expect(resultado).toEqual([]);
    });

    it('remover um horario nao afeta outro horario do mesmo dia nem outra agenda', () => {
        const iniciais = [slot(T1, AGENDA_MANHA, MANHA), slot(T2, AGENDA_MANHA, MANHA), slot(T2, AGENDA_TARDE, TARDE)];
        const atuais = [slot(T2, AGENDA_TARDE, TARDE)];

        const resultado = propagarEdicaoRecorrente({
            iniciais,
            atuais,
            dataInicial: INICIO_PERIODO,
            dataFinal: FIM_PERIODO,
            hoje: HOJE_ANTES_DO_PERIODO,
        });

        expect(resumir(resultado)).toEqual([`${T2}|3|13:10:00`]);
    });

    it('datas anteriores a hoje ficam intactas na remocao', () => {
        const iniciais = [slot(T1, AGENDA_MANHA, MANHA), slot(T2, AGENDA_MANHA, MANHA), slot(T3, AGENDA_MANHA, MANHA)];
        const atuais = [slot(T1, AGENDA_MANHA, MANHA), slot(T3, AGENDA_MANHA, MANHA)];

        const resultado = propagarEdicaoRecorrente({
            iniciais,
            atuais,
            dataInicial: INICIO_PERIODO,
            dataFinal: FIM_PERIODO,
            hoje: new Date(2026, 11, 1),
        });

        expect(resumir(resultado)).toEqual([`${T1}|2|07:30:00`]);
    });

    it('nao cria a adicao em datas anteriores a hoje', () => {
        const iniciais = [slot(T1, AGENDA_MANHA, MANHA), slot(T2, AGENDA_MANHA, MANHA), slot(T3, AGENDA_MANHA, MANHA)];
        const atuais = [...iniciais, slot(T2, AGENDA_TARDE, TARDE)];

        const resultado = propagarEdicaoRecorrente({
            iniciais,
            atuais,
            dataInicial: INICIO_PERIODO,
            dataFinal: FIM_PERIODO,
            hoje: new Date(2026, 11, 1),
        });

        expect(resumir(resultado.filter((s) => s.agenda_id === AGENDA_TARDE))).toEqual([`${T2}|3|13:10:00`, `${T3}|3|13:10:00`]);
    });

    it('um slot adicionado explicitamente nunca e removido pela propagacao, e nao recria o horario removido', () => {
        const iniciais = [slot(T1, AGENDA_MANHA, MANHA)];
        const atuais = [slot(T2, AGENDA_MANHA, MANHA)];

        const resultado = propagarEdicaoRecorrente({
            iniciais,
            atuais,
            dataInicial: INICIO_PERIODO,
            dataFinal: FIM_PERIODO,
            hoje: HOJE_ANTES_DO_PERIODO,
        });

        expect(resumir(resultado)).toEqual([`${T2}|2|07:30:00`, `${T3}|2|07:30:00`]);
    });

    it('nao duplica slot que ja existe no resultado', () => {
        const iniciais = [slot(T1, AGENDA_MANHA, MANHA), slot(T2, AGENDA_MANHA, MANHA), slot(T3, AGENDA_MANHA, MANHA)];
        const atuais = [slot(T1, AGENDA_TARDE, TARDE), slot(T2, AGENDA_TARDE, TARDE), slot(T3, AGENDA_MANHA, MANHA)];

        const resultado = propagarEdicaoRecorrente({
            iniciais,
            atuais,
            dataInicial: INICIO_PERIODO,
            dataFinal: FIM_PERIODO,
            hoje: HOJE_ANTES_DO_PERIODO,
        });

        expect(resumir(resultado)).toEqual([`${T1}|3|13:10:00`, `${T2}|3|13:10:00`, `${T3}|3|13:10:00`]);
    });

    it('respeita o limite dataFinal ao criar ocorrencias', () => {
        const iniciais = [slot(T1, AGENDA_MANHA, MANHA)];
        const atuais = [slot(T1, AGENDA_TARDE, TARDE)];

        const resultado = propagarEdicaoRecorrente({
            iniciais,
            atuais,
            dataInicial: INICIO_PERIODO,
            dataFinal: new Date(2026, 11, 7),
            hoje: HOJE_ANTES_DO_PERIODO,
        });

        expect(resumir(resultado)).toEqual([`${T1}|3|13:10:00`, `${T2}|3|13:10:00`]);
    });
});
