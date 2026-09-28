import { HORARIOS_PADRAO } from '@/constants/turnos';
import { Agenda, AgendaDiasSemanaType, Horario, SlotCalendario } from '@/types';
import { format } from 'date-fns';

export interface SlotDerivado {
    dia: AgendaDiasSemanaType;
    horaLabel: string;
    slot: SlotCalendario;
}

interface HorarioReservado {
    horario: Horario;
    autor: string;
    reserva_titulo: string;
}

function mapearHorariosReservados(agenda: Agenda, slotsSolicitados?: SlotCalendario[]): Map<string, HorarioReservado> {
    const map = new Map<string, HorarioReservado>();
    const reservaDaProp = slotsSolicitados?.[0]?.dadosReserva?.horarioDB?.reserva?.id;

    agenda.horarios?.forEach((horario) => {
        if (horario.situacao === 'deferida' && horario.reserva && horario.reserva.id !== reservaDaProp) {
            map.set(`${horario.data}|${horario.horario_inicio}`, {
                horario,
                autor: horario.reserva.user?.name ?? 'Indefinido',
                reserva_titulo: horario.reserva.titulo,
            });
        }
    });

    return map;
}

export function derivarSlotsDoTurno(
    agenda: Agenda,
    diasSemana: AgendaDiasSemanaType[],
    slotsSolicitados?: SlotCalendario[],
    agora: Date = new Date(),
): SlotDerivado[] {
    const horariosDoTurno = (HORARIOS_PADRAO as Record<string, readonly string[] | undefined>)[agenda.turno];
    if (!horariosDoTurno) {
        return [];
    }

    const horariosReservadosMap = mapearHorariosReservados(agenda, slotsSolicitados);

    const slotsSolicitadosMap = new Map<string, SlotCalendario>();
    slotsSolicitados?.forEach((slot) => slotsSolicitadosMap.set(slot.id, slot));

    const derivados: SlotDerivado[] = [];

    horariosDoTurno.forEach((horaLabel) => {
        const [horario_inicio_str, horario_fim_str] = horaLabel.split(' - ').map((s) => s.trim() + ':00');

        diasSemana.forEach((dia) => {
            const diaFormatado = format(dia.data, 'yyyy-MM-dd');
            const chave = `${diaFormatado}|${horario_inicio_str}`;
            const isPast = new Date(`${diaFormatado}T${horario_inicio_str}`) < agora;

            const horarioSolicitado = slotsSolicitadosMap.get(chave);
            const horarioReservado = horariosReservadosMap.get(chave);

            let slot: SlotCalendario;

            if (horarioSolicitado) {
                slot = { ...horarioSolicitado, isPast };
            } else if (horarioReservado) {
                slot = {
                    id: chave,
                    status: 'reservado',
                    data: dia.data,
                    horario_inicio: horario_inicio_str,
                    horario_fim: horario_fim_str,
                    isPast,
                    dadosReserva: {
                        horarioDB: horarioReservado.horario,
                        autor: horarioReservado.autor,
                        reserva_titulo: horarioReservado.reserva_titulo,
                    },
                };
            } else {
                slot = {
                    id: chave,
                    status: 'livre',
                    data: dia.data,
                    horario_inicio: horario_inicio_str,
                    horario_fim: horario_fim_str,
                    agenda_id: agenda.id,
                    isPast,
                };
            }

            derivados.push({ dia, horaLabel, slot });
        });
    });

    return derivados;
}
