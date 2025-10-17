export type TicketType = 'SP' | 'SG' | 'SE';
export type TicketStatus = 'queued' | 'called' | 'served' | 'discarded';

export interface Ticket {
  id: number;
  code: string;         
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
const sequences: Record<string, number> = {};
let lastPriorityCalled: TicketType | null = null; 

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


export function callNext(counter: number): Ticket | null {
  const pick = (): Ticket | null => {
    if (lastPriorityCalled === 'SP') {
      return popFromQueue('SE') ?? popFromQueue('SG') ?? popFromQueue('SP');
    }
    return popFromQueue('SP') ?? popFromQueue('SE') ?? popFromQueue('SG');
  };

  const t = pick();
  if (!t) return null;

  t.status = 'called';
  t.called_at = new Date();
  t.counter = counter;

  lastPriorityCalled = t.type;

  
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

  const all: Ticket[] = [
    ...queues.SP, ...queues.SG, ...queues.SE,
    ...calls.map(c => ({ id: c.ticket_id } as Ticket)),
  ];
  let found: Ticket | undefined;

  for (const k of ['SP', 'SG', 'SE'] as TicketType[]) {
    const idx = queues[k].findIndex(x => x.id === id);
    if (idx >= 0) { found = queues[k][idx]; break; }
  }

  if (found) {
    found.status = 'served';
    found.served_at = new Date();
    return true;
  }

  return true; 
}

export function lastCalls(limit = 5): CallRow[] {
  return calls.slice(-limit).reverse();
}




function ymd(d: Date) { return d.toISOString().slice(0,10); }
function sameMonth(d: Date, y: number, m: number) {
  return d.getFullYear() === y && (d.getMonth()+1) === m;
}

export function reportDaily(dateStr: string) {
  // tickets emitidos no dia
  const allTickets = [...queues.SP, ...queues.SG, ...queues.SE];
  const issued = allTickets.filter(t => ymd(t.issued_at) === dateStr);

  // chamadas no dia
  const inDayCalls = calls.filter(c => ymd(new Date(c.called_at)) === dateStr);

  const tipos: Record<TicketType, number> = { SP:0, SG:0, SE:0 };
  issued.forEach(t => tipos[t.type]++);

  return {
    totais: {
      emitidas: issued.length,
      atendidas: inDayCalls.length,
      descartadas: 0
    },
    tipos,
    detalhado: issued
      .map(t => ({ code: t.code, type: t.type, issued_at: t.issued_at, counter: t.counter ?? null }))
      .sort((a,b) => +new Date(b.issued_at) - +new Date(a.issued_at))
  };
}

export function reportMonthly(year: number, month: number) {
  const allTickets = [...queues.SP, ...queues.SG, ...queues.SE];
  const monthTickets = allTickets.filter(t => sameMonth(t.issued_at, year, month));
  const monthCalls   = calls.filter(c => sameMonth(new Date(c.called_at), year, month));

  const tipos: Record<TicketType, number> = { SP:0, SG:0, SE:0 };
  monthTickets.forEach(t => tipos[t.type]++);

  return {
    totais: {
      emitidas: monthTickets.length,
      atendidas: monthCalls.length,
      descartadas: 0
    },
    tipos
  };
}
