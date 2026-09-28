import { FiltrosRelatorio, FormatoRelatorio, TipoRelatorio } from '@/types';
import { useState } from 'react';
import { toast } from 'sonner';

interface PayloadGerarRelatorio {
    tipo: TipoRelatorio;
    formato: FormatoRelatorio;
    filtros?: FiltrosRelatorio;
}

export function useGerarRelatorio(endpoint: string) {
    const [estaGerando, setEstaGerando] = useState(false);

    const gerar = async (payload: PayloadGerarRelatorio) => {
        setEstaGerando(true);

        try {
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
                Accept: 'application/json, application/pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };

            if (xsrfCookie) {
                headers['X-XSRF-TOKEN'] = xsrfCookie;
            } else if (metaToken) {
                headers['X-CSRF-TOKEN'] = metaToken;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'same-origin',
                headers,
                body: JSON.stringify({
                    tipo: payload.tipo,
                    formato: payload.formato,
                    ...payload.filtros,
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Erro ao gerar relatório.';
                try {
                    const contentType = response.headers.get('content-type');
                    if (contentType?.includes('application/json')) {
                        const data = (await response.json()) as { message?: string; error?: string };
                        errorMessage = data.message ?? data.error ?? errorMessage;
                    } else {
                        const text = await response.text();
                        // Se o backend retornar texto simples ou HTML, extrai a mensagem limpa
                        const match = /<title>(.*?)<\/title>/i.exec(text) ?? /class="[^"]*message[^"]*">([^<]+)</i.exec(text);
                        if (match?.[1]) {
                            errorMessage = match[1].trim();
                        } else if (text.length < 200) {
                            errorMessage = text.trim();
                        }
                    }
                } catch {
                    // Mantém a mensagem padrão
                }

                toast.error(errorMessage);
                return;
            }

            const blob = await response.blob();

            const contentDisposition = response.headers.get('content-disposition');
            let filename = `relatorio.${payload.formato}`;

            if (contentDisposition) {
                const match = /filename\*?=(?:UTF-8\x27\x27)?"?([^";]+)"?/i.exec(contentDisposition);
                if (match?.[1]) {
                    filename = decodeURIComponent(match[1].trim());
                }
            }

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);

            toast.success('Relatório gerado e baixado com sucesso.');
        } catch {
            toast.error('Falha na comunicação com o servidor ao gerar o relatório.');
        } finally {
            setEstaGerando(false);
        }
    };

    return { gerar, estaGerando };
}
