import { parseDataLocal } from '@/lib/utils';
import { addDays, format, getDay, isAfter, startOfDay } from 'date-fns';

export interface SlotPayloadRecorrencia {
    data: string;
    horario_inicio: string;
    horario_fim: string;
    agenda_id?: number;
}

interface PropagarEdicaoRecorrenteParams {
    iniciais: SlotPayloadRecorrencia[];
    atuais: SlotPayloadRecorrencia[];
    dataInicial: Date;
    dataFinal: Date;
    hoje: Date;
}

const chaveSlot = (slot: SlotPayloadRecorrencia) => `${String(slot.agenda_id ?? '')}|${slot.data}|${slot.horario_inicio}`;

const chaveDiaSemana = (slot: SlotPayloadRecorrencia) =>
    `${String(slot.agenda_id ?? '')}|${String(getDay(parseDataLocal(slot.data)))}|${slot.horario_inicio}`;

export function propagarEdicaoRecorrente({
    iniciais,
    atuais,
    dataInicial,
    dataFinal,
    hoje,
}: PropagarEdicaoRecorrenteParams): SlotPayloadRecorrencia[] {
    const chavesAtuais = new Set(atuais.map(chaveSlot));
    const chavesIniciais = new Set(iniciais.map(chaveSlot));

    const removidos = iniciais.filter((slot) => !chavesAtuais.has(chaveSlot(slot)));
    const adicionados = atuais.filter((slot) => !chavesIniciais.has(chaveSlot(slot)));

    const chavesAdicionadas = new Set(adicionados.map(chaveSlot));
    const chavesRemovidas = new Set(removidos.map(chaveSlot));
    const diaSemanaRemovidos = new Set(removidos.map(chaveDiaSemana));
    const hojeIso = format(hoje, 'yyyy-MM-dd');
    const inicioPropagacao = startOfDay(dataInicial.getTime() > hoje.getTime() ? dataInicial : hoje);
    const fimPropagacao = startOfDay(dataFinal);
    const fimPropagacaoIso = format(fimPropagacao, 'yyyy-MM-dd');

    const resultado = atuais.filter((slot) => {
        if (slot.data > fimPropagacaoIso) {
            return false;
        }
        if (chavesAdicionadas.has(chaveSlot(slot))) {
            return true;
        }
        return !(slot.data >= hojeIso && diaSemanaRemovidos.has(chaveDiaSemana(slot)));
    });

    const chavesResultado = new Set(resultado.map(chaveSlot));

    for (const adicionado of adicionados) {
        const diaSemana = getDay(parseDataLocal(adicionado.data));
        const deslocamento = (diaSemana - getDay(inicioPropagacao) + 7) % 7;

        for (let cursor = addDays(inicioPropagacao, deslocamento); !isAfter(cursor, fimPropagacao); cursor = addDays(cursor, 7)) {
            const candidato: SlotPayloadRecorrencia = {
                data: format(cursor, 'yyyy-MM-dd'),
                horario_inicio: adicionado.horario_inicio,
                horario_fim: adicionado.horario_fim,
                agenda_id: adicionado.agenda_id,
            };
            const chave = chaveSlot(candidato);

            if (chavesResultado.has(chave) || chavesRemovidas.has(chave)) {
                continue;
            }

            chavesResultado.add(chave);
            resultado.push(candidato);
        }
    }

    return resultado;
}
