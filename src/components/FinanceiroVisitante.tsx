import { DollarSign, FileText, CheckCircle2, AlertCircle, Users } from 'lucide-react';

interface FinanceiroVisitanteProps {
  mensalistasValor: number;
  diaristasValor: number;
  pessoasPagaramCount: number;
  mensalistasPendentesCount: number;
  diaristasUnicosCount: number;
}

export default function FinanceiroVisitante({
  mensalistasValor,
  diaristasValor,
  pessoasPagaramCount,
  mensalistasPendentesCount,
  diaristasUnicosCount
}: FinanceiroVisitanteProps) {
  const totalArrecadado = mensalistasValor + diaristasValor;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px', width: '100%', overflowX: 'hidden', backgroundColor: '#09090b', minHeight: '100vh' }}>
      
      {/* CARD 1: FINANCEIRO GERAL */}
      <div style={{
        backgroundColor: '#18181b', // Zinc-900 (Dark background)
        border: '1px solid rgba(59, 130, 246, 0.5)', // Blue neon subtle border
        borderRadius: '16px',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <DollarSign size={18} color="#a1a1aa" />
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#d4d4d8', margin: 0, letterSpacing: '0.5px' }}>
            FINANCEIRO GERAL
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 10px' }}>
          {/* Row 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Arrecadação Total</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#22c55e', letterSpacing: '-0.5px' }}>{formatCurrency(totalArrecadado)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Despesas Totais</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.5px' }}>R$ 0,00</span>
          </div>
          
          {/* Row 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Recebido no mês</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#22c55e', letterSpacing: '-0.5px' }}>{formatCurrency(mensalistasValor + diaristasValor)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Despesas (mês)</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.5px' }}>R$ 0,00</span>
          </div>

          {/* Row 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Pendências (mês)</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.5px' }}>{/* Visitante não vê valor de pendência */}R$ 0,00</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Saldo Atual</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#22c55e', letterSpacing: '-0.5px' }}>{formatCurrency(totalArrecadado)}</span>
          </div>
        </div>
      </div>

      {/* CARD 2: RESUMO MENSAL (ATUAL) */}
      <div style={{
        backgroundColor: '#18181b', // Zinc-900 (Dark background)
        border: '1px solid rgba(59, 130, 246, 0.5)', // Blue neon subtle border
        borderRadius: '16px',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <FileText size={18} color="#a1a1aa" />
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#d4d4d8', margin: 0, letterSpacing: '0.5px' }}>
            RESUMO MENSAL (ATUAL)
          </h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0' }}>
          
          {/* Col 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <CheckCircle2 size={16} color="#22c55e" />
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e', lineHeight: 1, marginBottom: '6px' }}>{pessoasPagaramCount}</span>
            <span style={{ fontSize: '0.65rem', color: '#a1a1aa', textAlign: 'center', fontWeight: 500, lineHeight: 1.3 }}>Mensalistas<br/>pagos</span>
          </div>

          {/* Col 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <AlertCircle size={16} color="#ef4444" />
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', lineHeight: 1, marginBottom: '6px' }}>{mensalistasPendentesCount}</span>
            <span style={{ fontSize: '0.65rem', color: '#a1a1aa', textAlign: 'center', fontWeight: 500, lineHeight: 1.3 }}>Mensalistas<br/>pendentes</span>
          </div>

          {/* Col 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{ marginBottom: '12px', height: '32px', display: 'flex', alignItems: 'center' }}>
              <Users size={22} color="#f97316" strokeWidth={1.5} />
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f97316', lineHeight: 1, marginBottom: '6px' }}>{diaristasUnicosCount}</span>
            <span style={{ fontSize: '0.65rem', color: '#a1a1aa', textAlign: 'center', fontWeight: 500, lineHeight: 1.3 }}>Diaristas<br/>(Últ. Partida)</span>
          </div>

        </div>
      </div>

    </div>
  );
}
