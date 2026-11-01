# Semântica de Recorrência — UniEspaços

## Visão Geral

Recorrência define como um padrão de horários (agenda + dia da semana + faixa horária) se expande no tempo.

- **Front:** `resources/js/constants/recorrencia.ts` calcula o `data_final` padrão de cada tipo (`calcularDataFinal`).
- **Backend:** `app/Services/ExpansaoHorariosService.php` expande os slots em linhas de `horarios`. O `StoreReservaRequest` valida `data_final` com `after_or_equal:data_inicial`, e o backend usa o `data_final` recebido na expansão.

| Tipo | Quem define `data_final` | Expansão | `data_final` editável? | Exemplo |
|------|--------------------------|----------|----------------------|---------|
| `unica` | Front: `data_inicial` + 6 dias (rótulo "Apenas esta semana") | Nenhuma: grava as datas recebidas | Não | Aulas avulsas em datas da mesma semana |
| `15dias` | Front: `data_inicial` + 14 dias | Semanal até `data_final` | Não | Reunião replicada pelos próximos 15 dias |
| `1mes` | Front: `data_inicial` + 1 mês (calendário) | Semanal até `data_final` | Não | Oficina replicada por 1 mês |
| `personalizado` | **Usuário** | Semanal até `data_final` | **Sim** | Aulas em ter/qui por 3 meses |

---

## 1. Tipo `unica`

### Características

- **Criação:** Usuário seleciona datas e horários. Cada item de `horarios_solicitados` traz a sua `data`.
- **`data_final`:** Calculada pelo front como `data_inicial` + 6 dias (`addDays(data, 6)`). Não é editável.
- **Expansão:** Nenhuma. O backend grava exatamente as datas recebidas, inclusive em semanas não contíguas (`ExpansaoHorariosService::semExpansao()`). O `data_final` não gera datas extras.
- **Banco:** N linhas em `horarios` (uma por slot único).

### Exemplo

```
Entrada:
  data_inicial: 2026-09-15
  data_final: 2026-09-21 (calculada pelo front: +6 dias)
  horarios_solicitados: [
    { agenda_id: 1, data: 2026-09-15, horario_inicio: 10:00, horario_fim: 11:00 },
    { agenda_id: 1, data: 2026-09-15, horario_inicio: 14:00, horario_fim: 15:00 },
  ]

Saída (horarios):
  ├─ 2026-09-15 10:00-11:00 (agenda 1)
  └─ 2026-09-15 14:00-15:00 (agenda 1)

Total: 2 horários (nenhuma expansão)
```

---

## 2. Tipo `15dias`

### Características

- **Criação:** Usuário seleciona uma data inicial e os padrões (agenda + dia da semana + horário).
- **`data_final`:** Calculada pelo front como `data_inicial` + 14 dias (`addDays(data, 14)`). Não é editável.
- **Expansão:** Semanal até `data_final` (inclusive). Cada padrão é ancorado na sua menor data selecionada.
- **Banco:** N padrões × semanas até `data_final` linhas em `horarios`.

### Exemplo

```
Entrada:
  data_inicial: 2026-09-01 (terça)
  data_final: 2026-09-15 (calculada pelo front: +14 dias)
  horarios_solicitados: [
    { agenda_id: 1, data: 2026-09-01, horario_inicio: 10:00, horario_fim: 11:00 },
  ]

Saída (horarios):
  ├─ 2026-09-01 10:00-11:00 (agenda 1) — terça 1
  ├─ 2026-09-08 10:00-11:00 (agenda 1) — terça 2
  └─ 2026-09-15 10:00-11:00 (agenda 1) — terça 3

Total: 3 horários. 2026-09-22 fica fora por ser posterior a data_final.
```

---

## 3. Tipo `1mes`

### Características

- **Criação:** Usuário seleciona uma data inicial e os padrões.
- **`data_final`:** Calculada pelo front como `data_inicial` + 1 mês (`addMonths(data, 1)`). Não é editável.
- **Expansão:** Semanal até `data_final`.
- **Banco:** N padrões × (~4-5 semanas) linhas.

### Exemplo

```
Entrada:
  data_inicial: 2026-09-01 (terça)
  data_final: 2026-10-01 (calculada pelo front: +1 mês)
  horarios_solicitados: [
    { agenda_id: 1, data: 2026-09-01, horario_inicio: 14:00, horario_fim: 15:00 },
  ]

Saída (horarios):
  ├─ 2026-09-01 14:00-15:00 (agenda 1)
  ├─ 2026-09-08 14:00-15:00 (agenda 1)
  ├─ 2026-09-15 14:00-15:00 (agenda 1)
  ├─ 2026-09-22 14:00-15:00 (agenda 1)
  └─ 2026-09-29 14:00-15:00 (agenda 1)

Total: 5 horários. 2026-10-01 é quinta-feira, então não entra na sequência de terças.
```

---

## 4. Tipo `personalizado`

### Características

- **Criação:** Usuário seleciona o intervalo (`data_inicial` e `data_final`, ambas editáveis) e os padrões (dias da semana + horários).
- **`data_final`:** Editável pelo usuário. O sistema não calcula.
- **Expansão:** Semanal até o `data_final` informado.
- **Frontend:** Dois `DatePicker` (intervalo) e seleção de múltiplos dias da semana.
- **Banco:** N padrões × semanas no intervalo linhas.

### Exemplo

Mesmo cenário do teste `test_personalizado_expande_semanalmente_ate_data_final`:

```
Entrada:
  data_inicial: 2026-09-01 (terça)
  data_final: 2026-09-30 (informada pelo usuário)
  horarios_solicitados: [
    { agenda_id: 1, data: 2026-09-01, horario_inicio: 10:00, horario_fim: 11:00 }, // padrão terça
    { agenda_id: 1, data: 2026-09-03, horario_inicio: 14:00, horario_fim: 15:00 }, // padrão quinta
  ]

Saída (horarios):
  ├─ Terças: 01, 08, 15, 22, 29 de setembro (5 horários)
  └─ Quintas: 03, 10, 17, 24 de setembro (4 horários)

Total: 9 horários. A quinta 01/10 fica fora do período.
```

### Por que expande semanalmente

`15dias`, `1mes` e `personalizado` são **períodos**, não frequências. `ExpansaoHorariosService::expandindoSemanalmente()` repete cada padrão a cada 7 dias até `data_final`. Assim, `personalizado` segue a mesma semântica dos outros dois tipos, com o intervalo escolhido pelo usuário. Uma seleção livre de datas avulsas não é `personalizado`; se for necessária, deve ser um novo tipo de recorrência, sem alterar este.

---

## Histórico da hipótese H1

A auditoria levantou a hipótese de que `personalizado` deveria ser seleção livre de datas. Ela foi descartada: o comportamento atual é o pretendido, e a implementação está alinhada com a interface (intervalo editável e padrões semanais). Nenhuma alteração de implementação foi feita, e o comportamento é travado pelo teste `tests/Unit/Services/ExpansaoHorariosServiceTest.php::test_personalizado_expande_semanalmente_ate_data_final`.
