import { useState } from 'react';
import { DollarSign, CreditCard, Search, AlertTriangle } from 'lucide-react';
import { Button, Card, Input, Badge, Alert } from '../components/ui';
import { jugadorService } from '../services/api';
import api from '../services/api';

interface Jugador {
  id_jugador: number;
  nombre_completo: string;
  apodo: string | null;
  saldo_credito: number;
  limite_credito: number;
}

export default function CobrosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<Jugador | null>(null);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [procesando, setProcesando] = useState(false);
  const [cobroExitoso, setCobroExitoso] = useState(false);

  const buscarJugador = async () => {
    if (!busqueda.trim()) return;
    try {
      const data = await jugadorService.getCreditos();
      const filtrados = data.filter((j: Jugador) => 
        j.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
        j.apodo?.toLowerCase().includes(busqueda.toLowerCase())
      );
      setJugadores(filtrados);
    } catch (e) { console.error(e); }
  };

  const handleCobro = async () => {
    if (!jugadorSeleccionado || !monto) return;
    setProcesando(true);
    try {
      await api.post('/cobros', {
        id_jugador: jugadorSeleccionado.id_jugador,
        monto: Number(monto),
        metodo_pago: metodo,
      });
      setCobroExitoso(true);
      setJugadorSeleccionado(null);
      setMonto('');
      setBusqueda('');
      setJugadores([]);
      setTimeout(() => setCobroExitoso(false), 3000);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error al procesar cobro');
    } finally {
      setProcesando(false);
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-pearl">Cobros de Crédito</h1><p className="text-silver">Registrar pagos de crédito de jugadores</p></div>

      {cobroExitoso && <Alert type="success" title="Cobro Exitoso">El cobro se ha registrado correctamente.</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="1. Seleccionar Jugador con Crédito">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-silver" />
                <input type="text" placeholder="Buscar jugador con crédito..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarJugador()} className="w-full pl-10 pr-4 py-2.5 bg-slate border border-graphite rounded-lg text-pearl placeholder:text-silver/60 focus:outline-none focus:border-gold" />
              </div>
              <Button onClick={buscarJugador}>Buscar</Button>
            </div>

            {jugadores.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {jugadores.map((j) => (
                  <button key={j.id_jugador} onClick={() => { setJugadorSeleccionado(j); setJugadores([]); setMonto(j.saldo_credito.toString()); }} className={`w-full text-left p-3 rounded-lg border transition-all ${jugadorSeleccionado?.id_jugador === j.id_jugador ? 'border-gold bg-gold/10' : 'border-graphite hover:border-gold/50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-pearl">{j.nombre_completo}</p>
                        {j.apodo && <p className="text-sm text-silver">"{j.apodo}"</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-ruby font-bold">{fmt(j.saldo_credito)}</p>
                        <p className="text-xs text-silver">de {fmt(j.limite_credito)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {jugadorSeleccionado && (
              <div className="p-4 bg-ruby/10 border border-ruby/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-ruby mb-1">Deuda Actual:</p>
                    <p className="font-bold text-pearl">{jugadorSeleccionado.nombre_completo}</p>
                  </div>
                  <p className="text-2xl font-bold text-ruby">{fmt(jugadorSeleccionado.saldo_credito)}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="2. Detalles del Cobro">
          <div className="space-y-4">
            <Input label="Monto a Cobrar" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" leftIcon={<DollarSign className="w-5 h-5" />} />

            {jugadorSeleccionado && Number(monto) > jugadorSeleccionado.saldo_credito && (
              <Alert type="warning"><AlertTriangle className="w-4 h-4 inline mr-2" />El monto excede la deuda actual</Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-silver mb-2">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].map((m) => (
                  <button key={m} onClick={() => setMetodo(m as any)} className={`p-3 rounded-lg border text-center text-sm transition-all ${metodo === m ? 'border-gold bg-gold/10 text-gold' : 'border-graphite text-silver hover:border-gold/50'}`}>
                    {m === 'EFECTIVO' && <DollarSign className="w-5 h-5 mx-auto mb-1" />}
                    {m === 'TARJETA' && <CreditCard className="w-5 h-5 mx-auto mb-1" />}
                    {m === 'TRANSFERENCIA' && <span className="text-lg">🏦</span>}
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleCobro} isLoading={procesando} disabled={!jugadorSeleccionado || !monto || Number(monto) <= 0}>
              Registrar Cobro
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
