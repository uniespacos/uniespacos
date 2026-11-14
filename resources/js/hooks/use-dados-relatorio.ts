import { DadosRelatorio, FiltrosRelatorio, TipoRelatorio } from '@/types';
import { useEffect, useRef, useState } from 'react';

export type StatusDadosRelatorio = 'idle' | 'loading' | 'success' | 'error' | 'empty';

const DEBOUNCE_MS = 350;

interface DadosRelatorioPorTipo {
    tipo: TipoRelatorio;
    payload: DadosRelatorio;
}

export function useDadosRelatorio(endpoint: string, tipo: TipoRelatorio | undefined, filtros: FiltrosRelatorio | undefined) {
    const [dadosPorTipo, setDadosPorTipo] = useState<DadosRelatorioPorTipo | null>(null);
    const [status, setStatus] = useState<StatusDadosRelatorio>('idle');
    const [erro, setErro] = useState<string | null>(null);
    const ultimoContextoRef = useRef<{ endpoint: string; tipo: TipoRelatorio | undefined } | null>(null);

    const filtrosSerializados = JSON.stringify(filtros ?? {});

    useEffect(() => {
        if (!tipo) {
            ultimoContextoRef.current = null;
            setStatus('idle');
            setDadosPorTipo(null);
            setErro(null);
            return;
        }

        const anterior = ultimoContextoRef.current;
        const mudouTipo = anterior?.tipo !== tipo;
        const mudouEndpoint = anterior?.endpoint !== endpoint;
        const mudouTipoOuEndpoint = mudouTipo || mudouEndpoint;
        ultimoContextoRef.current = { endpoint, tipo };

        setStatus('loading');
        setErro(null);

        const controller = new AbortController();

        const buscar = async (signal: AbortSignal) => {
            const filtrosAtuais = JSON.parse(filtrosSerializados) as FiltrosRelatorio;

            const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
            const xsrfCookie = decodeURIComponent(
                document.cookie
                    .split('; ')
                    .find((r) => r.startsWith('XSRF-TOKEN='))
                    ?.split('=')[1] ?? '',
            );

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
            };

            if (xsrfCookie) {
                headers['X-XSRF-TOKEN'] = xsrfCookie;
            } else if (metaToken) {
                headers['X-CSRF-TOKEN'] = metaToken;
            }

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers,
                    body: JSON.stringify({ tipo, ...filtrosAtuais }),
                    signal,
                });

                if (!response.ok) {
                    setStatus('error');
                    setErro('Erro ao carregar dados do relatório.');
                    return;
                }

                const json: DadosRelatorio = await response.json();

                setDadosPorTipo({ tipo, payload: json });
                setStatus(json.linhas.length === 0 ? 'empty' : 'success');
            } catch {
                if (signal.aborted) {
                    return;
                }

                setStatus('error');
                setErro('Erro ao carregar dados do relatório.');
            }
        };

        const delayMs = mudouTipoOuEndpoint ? 0 : DEBOUNCE_MS;
        const timer = setTimeout(() => {
            void buscar(controller.signal);
        }, delayMs);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [endpoint, tipo, filtrosSerializados]);

    const dados = tipo && dadosPorTipo?.tipo === tipo ? dadosPorTipo.payload : null;
    const statusEfetivo: StatusDadosRelatorio = tipo && status === 'success' && dados === null ? 'loading' : status;

    return { dados, status: statusEfetivo, erro };
}
