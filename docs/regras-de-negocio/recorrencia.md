# Semântica de Recorrência — UniEspaços

## Visão Geral

Recorrência define como um padrão de horários (agenda + dia da semana + faixa horária) se expande no tempo. A tabela abaixo resume os 4 tipos suportados:

| Tipo | Quem define `data_final` | Expansão | `data_final` editável? | Exemplo |
|------|--------------------------|----------|----------------------|---------|
| `unica` | Sistema (= `data_inicial`) | Nenhuma | Não | Uma aula única em 15/set |
| `15dias` | Sistema (= `data_inicial` + 15 dias) | Semanal até `data_final` | Não | Reuniões quinzenais por 2 meses |
| `1mes` | Sistema (= `data_inicial` + 1 mês) | Semanal até `data_final` | Não | Workshops mensais por 1 mês |
| `personalizado` | **Usuário** | Semanal até `data_final` | **Sim** | Aulas em ter/qui por 3 meses (escolhidos pelo usuário) |

---

## 1. Tipo `unica`

### Características

- **Criação:** Usuário seleciona 1 data e múltiplos horários nessa data.
- **`data_final`:** Igual a `data_inicial`.
- **Expansão:** Nenhuma — gera exatamente N horários (1 por slot selecionado).
- **Frontend:** `DatePicker` exibe 1 data; após selecionar, `data_final` iguala-se automaticamente.
- **Banco:** N linhas em `horarios` (uma por slot selecionado).

### Exemplo Real

```
Entrada:
  data_inicial: 2026-09-15
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

- **Criação:** Usuário seleciona 1 data e padrões (agenda + dia_semana + horário).
- **`data_final`:** Calculado automaticamente = `data_inicial` + 15 dias.
- **Expansão:** Semanal até `data_final`, agrupando por (agenda, dia_semana, horário).
- **Frontend:** `DatePicker` (1 data); após selecionar, `data_final` exibe automaticamente o cálculo (não editável).
- **Banco:** N × (~2 semanas) linhas em `horarios`.

### Exemplo Real

```
Entrada:
  data_inicial: 2026-09-01 (terça)
  data_final: calculada automaticamente = 2026-09-16
  horarios_solicitados: [
    { agenda_id: 1, data: 2026-09-01, horario_inicio: 10:00, horario_fim: 11:00 },
  ]

Saída (horarios):
  ├─ 2026-09-01 10:00-11:00 (agenda 1) — Terça 1
  ├─ 2026-09-08 10:00-11:00 (agenda 1) — Terça 2
  └─ 2026-09-15 10:00-11:00 (agenda 1) — Terça 3

Total: 3 horários (expansão semanal até 15/set)
Obs: 2026-09-22 ficaria fora porque > 2026-09-16
```

---

## 3. Tipo `1mes`

### Características

- **Criação:** Usuário seleciona 1 data e padrões.
- **`data_final`:** Calculado automaticamente = `data_inicial` + 1 mês (calendário).
- **Expansão:** Semanal até `data_final`.
- **Frontend:** Análogo a `15dias`.
- **Banco:** N × (~4-5 semanas) linhas.

### Exemplo Real

```
Entrada:
  data_inicial: 2026-09-01 (terça)
  data_final: calculada automaticamente = 2026-10-01
  horarios_solicitados: [
    { agenda_id: 1, data: 2026-09-01, horario_inicio: 14:00, horario_fim: 15:00 },
  ]

Saída (horarios):
  ├─ 2026-09-01 14:00-15:00 (agenda 1) — Terça 1
  ├─ 2026-09-08 14:00-15:00 (agenda 1) — Terça 2
  ├─ 2026-09-15 14:00-15:00 (agenda 1) — Terça 3
  ├─ 2026-09-22 14:00-15:00 (agenda 1) — Terça 4
  ├─ 2026-09-29 14:00-15:00 (agenda 1) — Terça 5
  └─ 2026-10-01 não é terça (é quinta), não é incluída

Total: 5 horários (expansão semanal até 01/out)
```

---

## 4. Tipo `personalizado` (Recorrência sobre Período Personalizado)

### Características

- **Criação:** Usuário seleciona **intervalo de datas** (`data_inicial` até `data_final` **ambas definidas pelo usuário**) e padrões (dias da semana + horários em cada dia).
- **`data_final`:** **Editável pelo usuário** (não calculada pelo sistema).
- **Expansão:** Semanal até `data_final` do usuário.
- **Frontend:** **Dois** `DatePicker` (intervalo); ambos editáveis; padrões (dias da semana) também selecionáveis.
- **Banco:** N padrões × (número de semanas no intervalo) linhas.

### Exemplo Real: Evidência Histórica (Reserva ID 3629)

```
Entrada:
  data_inicial: 2026-08-20 (quinta-feira)
  data_final: 2026-12-18 (quinta-feira) — aprox. 4 meses, definidos pelo usuário
  horarios_solicitados: [
    { agenda_id: X, data: 2026-08-20, horario_inicio: HH:MM, horario_fim: HH:MM },  // Padrão 1
    { agenda_id: Y, data: 2026-08-20, horario_inicio: HH:MM, horario_fim: HH:MM },  // Padrão 2
    // ... (11 padrões distintos no total, combinando diferentes agenda_id + horario)
  ]

Saída (horarios):
  └─ Expande semanalmente por ~18 semanas (agosto até dezembro):
     ├─ 2026-08-20 HH:MM (padrão 1)
     ├─ 2026-08-20 HH:MM (padrão 2)
     ├─ ... (todos os 11 padrões no primeiro dia)
     ├─ 2026-08-27 HH:MM (padrão 1)
     ├─ 2026-08-27 HH:MM (padrão 2)
     ├─ ... (repete semanalmente até dezembro)
     └─ 2026-12-18 HH:MM (último padrão)

Total: **198 horários** (11 padrões × ~18 semanas ≈ 198)
```

**Por que 198?** Cada padrão (combinação de agenda + dia da semana + faixa horária) se repete **semanalmente** dentro do período de ~18 semanas definido pelo usuário (agosto até dezembro). 11 padrões distintos × ~18 semanas = 198 horários. Este é o comportamento esperado, não um bug.

---

## Por Que Não É Um Bug

1. **Semântica Consistente:** "Personalizado" = padrões recorrentes **semanalmente** sobre **período do usuário**. Isso é design intencional, não bug.

2. **UX Confirmada:** Frontend oferece dois `DatePicker` para o intervalo e permite seleção de múltiplos dias da semana — a interface explicitamente promete "recorrência semanal sobre período definido pelo usuário".

3. **Dados Reais:** 1.795 reservas de tipo `personalizado` existem na base de produção — usuários estão usando conforme a intenção de design.

4. **Teste de Regressão:** Esta fase (Fase 05) adiciona teste de cobertura em `tests/Unit/Services/ExpansaoHorariosServiceTest.php` (`test_personalizado_expande_semanalmente_ate_data_final`) que trava o comportamento atual como **correto**. O teste gera, para 2 padrões (terça e quinta começando em 2026-09-01/03) até `data_final=2026-09-30`: 5 terças + 4 quintas = **9 horários**.

---

## Reclassificação da Hipótese H1

### Original (Auditoria)

**Hipótese H1:** "`personalizado` está quebrado; implementação trata como recorrência semanal indefinida, divergindo de 'seleção livre de datas'."

**Classificação original:** CRÍTICA.

### Reclassificação (Esta Fase)

✅ **Falso Positivo**

**Justificativa da Reclassificação:**

A auditoria original confundiu dois conceitos:
- **"Seleção livre de datas"** (que poderia significar "qualquer dia, sem padrão semanal")
- **"Período personalizado"** (que significa "intervalo definido pelo usuário, com padrões semanais dentro dele")

Análise de evidência real mostrou que `personalizado` implementa o segundo, não o primeiro — e a implementação está alinhada com a UX frontend (dois `DatePicker` editáveis, opção de múltiplos dias da semana).

**Impacto:** Alterar o comportamento de `personalizado` seria regressão destrutiva afetando 1.795 reservas (33% da base de ~5.400 reservas).

**Conclusão:** Nesta fase, o comportamento é documentado e blindado com testes. Nenhuma alteração de implementação foi feita — o sistema continua funcionando como projetado.

---

## Documentação de Mudanças Futuras

Se um futuro desenvolvimento requerer uma **quarta semântica** (ex: "Seleção Livre de Datas" = qualquer combinação arbitrária de datas, sem padrão semanal), ela será um **novo tipo de recorrência**, nunca uma alteração de `personalizado`.

Exemplo hipotético:
```php
enum RecorrenciaReservaEnum: string {
    case UNICA = 'unica';
    case QUINZE_DIAS = '15dias';
    case UM_MES = '1mes';
    case PERSONALIZADO = 'personalizado';  // Mantém semântica existente: padrões semanais
    case LIVRE = 'livre';                  // NOVO: datas arbitrárias, sem padrão
}
```

Essa separação preserva a integridade das 1.795 reservas existentes de `personalizado` enquanto permite uma nova UX para usuários que queremos "seleção verdadeiramente livre".

---

**Data de Documento:** 2026-08-29  
**Versão:** 1.0  
**Status:** Referência canônica para semântica de recorrência — Fase 05 de modernização de regras de reserva
