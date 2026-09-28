import { DadosRelatorio, FiltrosRelatorio, TipoRelatorio } from '@/types';
import { useEffect, useState } from 'react';

export type StatusDadosRelatorio = 'idle' | 'loading' | 'success' | 'error' | 'empty';

const DEBOUNCE_MS = 350;

export function useDadosRelatorio(endpoint: string, tipo: TipoRelatorio | undefined, filtros: FiltrosRelatorio | undefined) {
    const [dados, setDados] = useState<DadosRelatorio | null>(null);
    const [status, setStatus] = useState<StatusDadosRelatorio>('idle');
    const [erro, setErro] = useState<string | null>(null);

    const filtrosSerializados = JSON.stringify(filtros ?? {});

    useEffect(() => {
        if (!tipo) {
            setStatus('idle');
            setDados(null);
            setErro(null);
            return;
        }

        const controller = new AbortController();

        const buscar = async (signal: AbortSignal) => {
            setStatus('loading');
            setErro(null);

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

                setDados(json);
                setStatus(json.linhas.length === 0 ? 'empty' : 'success');
            } catch {
                if (signal.aborted) {
                    return;
                }

                setStatus('error');
                setErro('Erro ao carregar dados do relatório.');
            }
        };

        const timer = setTimeout(() => {
            void buscar(controller.signal);
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [endpoint, tipo, filtrosSerializados]);

    return { dados, status, erro };
}
