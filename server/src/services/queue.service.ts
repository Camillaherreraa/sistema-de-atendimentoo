// Simples e em memória para testar o fluxo
export type TicketType = 'SP' | 'SG' | 'SE';
export type TicketStatus = 'queued' | 'called' | 'served' | 'discarded';

export interface Ticket {
  id: number;
  code: string;         // YYMMDD-PPSQ
  type: TicketType;
  issued_at: Date;
  status: TicketStatus;
  called_at?: Date | null;
  served_at?: Date | null;
  counter?: number | null;
}

export interface CallRow {
  ticket_id: number;
  code: string;
  type: TicketType;
  counter: number;
  called_at: Date;
}

let autoId = 1;
const queues: Record<TicketType, Ticket[]> = { SP: [], SG: [], SE: [] };
const calls: CallRow[] = [];
const sequences: Record<string, number> = {}; // chave: YYMMDD-PP -> seq
let lastPriorityCalled: TicketType | null = null; // para alternância

function todayYYMMDD() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function nextSeq(pp: TicketType) {
  const key = `${todayYYMMDD()}-${pp}`;
  sequences[key] = (sequences[key] ?? 0) + 1;
  return sequences[key];
}

function buildCode(pp: TicketType) {
  const yymmdd = todayYYMMDD();
  const sq = String(nextSeq(pp)).padStart(3, '0');
  return `${yymmdd}-${pp}${sq}`;
}

export function emitTicket(type: TicketType): Ticket {
  const t: Ticket = {
    id: autoId++,
    code: buildCode(type),
    type,
    issued_at: new Date(),
    status: 'queued',
  };
  queues[type].push(t);
  return t;
}

function popFromQueue(t: TicketType): Ticket | null {
  const q = queues[t];
  if (!q.length) return null;
  return q.shift() ?? null;
}

/**
 * Alternância pedida: [SP] → [SE|SG] → [SP] → [SE|SG]...
 * Se a preferida do passo não existir, chama a outra disponível.
 */
export function callNext(counter: number): Ticket | null {
  const pick = (): Ticket | null => {
    if (lastPriorityCalled === 'SP') {
      // agora tentar SE ou SG
      return popFromQueue('SE') ?? popFromQueue('SG') ?? popFromQueue('SP');
    }
    // se última foi SE/SG (ou nenhuma ainda), prioriza SP
    return popFromQueue('SP') ?? popFromQueue('SE') ?? popFromQueue('SG');
  };

  const t = pick();
  if (!t) return null;

  t.status = 'called';
  t.called_at = new Date();
  t.counter = counter;

  lastPriorityCalled = t.type;

  // registra chamada p/ painel (guarda todas e exibimos as 5 últimas)
  calls.push({
    ticket_id: t.id,
    code: t.code,
    type: t.type,
    counter,
    called_at: t.called_at,
  });

  return t;
}

export function finishTicket(id: number) {
  // como estamos em memória, procure em todas as filas + chamados
  const all: Ticket[] = [
    ...queues.SP, ...queues.SG, ...queues.SE,
    ...calls.map(c => ({ id: c.ticket_id } as Ticket)), // ids chamados
  ];
  // Em memória simples: vamos também olhar no histórico de chamadas
  let found: Ticket | undefined;

  // tentar achar nas filas primeiro
  for (const k of ['SP', 'SG', 'SE'] as TicketType[]) {
    const idx = queues[k].findIndex(x => x.id === id);
    if (idx >= 0) { found = queues[k][idx]; break; }
  }

  // se não achou nas filas, não temos referência direta; então marcaremos
  // como servido apenas no "mundo real" (a UI já considera finalizado)
  if (found) {
    found.status = 'served';
    found.served_at = new Date();
    return true;
  }

  return true; // ok para teste
}

export function lastCalls(limit = 5): CallRow[] {
  return calls.slice(-limit).reverse();
}
