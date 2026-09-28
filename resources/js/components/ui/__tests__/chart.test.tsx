import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '../chart';

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
});

describe('ChartTooltipContent - regressão config[label] undefined', () => {
  it('usa o label bruto como fallback quando a categoria não está em chartConfig', () => {
    const config: ChartConfig = {
      taxa_ocupacao_num: {
        label: 'Taxa de Ocupação (%)',
        color: '#3b82f6',
      },
    };

    const payload = [
      {
        dataKey: 'taxa_ocupacao_num',
        name: 'taxa_ocupacao_num',
        value: 42,
        payload: {},
      },
    ];

    render(
      <ChartContainer config={config}>
        <ChartTooltipContent active payload={payload} label="Auditório Central" />
      </ChartContainer>
    );

    expect(screen.getByText('Auditório Central')).toBeInTheDocument();
  });

  it('usa o label do chartConfig quando a chave existe', () => {
    const config: ChartConfig = {
      taxa_ocupacao_num: {
        label: 'Taxa de Ocupação (%)',
        color: '#3b82f6',
      },
    };

    const payload = [
      {
        dataKey: 'taxa_ocupacao_num',
        name: 'taxa_ocupacao_num',
        value: 42,
        payload: {},
      },
    ];

    render(
      <ChartContainer config={config}>
        <ChartTooltipContent active payload={payload} label="taxa_ocupacao_num" />
      </ChartContainer>
    );

    const elements = screen.getAllByText('Taxa de Ocupação (%)');
    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0]).toBeInTheDocument();
  });

  it('usa o label bruto como fallback para valores dinâmicos de espaço', () => {
    const config: ChartConfig = {
      metrica1: {
        label: 'Métrica 1',
        color: '#10b981',
      },
    };

    const payload = [
      {
        dataKey: 'metrica1',
        name: 'metrica1',
        value: 100,
        payload: {},
      },
    ];

    render(
      <ChartContainer config={config}>
        <ChartTooltipContent active payload={payload} label="Nome Dinâmico do Espaço" />
      </ChartContainer>
    );

    expect(screen.getByText('Nome Dinâmico do Espaço')).toBeInTheDocument();
  });
});
