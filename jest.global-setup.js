// Executa uma única vez, no processo principal do Jest, antes dos workers (que herdam este ambiente).
//
// Fixa o fuso em America/Bahia (UTC-03, sem horário de verão) para a suíte não depender da máquina:
// o ambiente local roda em America/Bahia e o CI (GitHub Actions) em UTC. Datas construídas a partir de
// strings ISO sem hora (`new Date('2026-06-03')` é meia-noite UTC) e formatadas no fuso local viravam
// "dia anterior" em um ambiente e "mesmo dia" no outro.
//
// Isso precisa estar aqui, e não em `jest.setup.js`: dentro do sandbox do Jest `process.env` é uma cópia, e
// alterar `TZ` ali não muda o fuso do processo. Definir `TZ=... npx jest` na linha de comando também não
// serve: o Node no Windows ignora `TZ` na inicialização. Por isso o valor é sempre forçado, ignorando o
// `TZ` do ambiente.
module.exports = async () => {
    process.env.TZ = 'America/Bahia';
};
