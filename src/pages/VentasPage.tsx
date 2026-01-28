import { useState } from 'react';
import { DollarSign, CreditCard, Search } from 'lucide-react';
import { Button, Card, Input, Modal, Badge, Alert } from '../components/ui';
import { jugadorService } from '../services/api';
import api from '../services/api';

interface Jugador {
  id_jugador: number;
  nombre_completo: string;
  apodo: string | null;
}

export default function VentasPage() {
  const [busqueda, setBusqueda] = useState('');
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<Jugador | null>(null);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'TARJETA'>('EFECTIVO');
  const [procesando, setProcesando] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(false);

  const buscarJugador = async () => {
    if (!busqueda.trim()) return;
    try {
      const data = await jugadorService.buscar(busqueda);
      setJugadores(data);
    } catch (e) { console.error(e); }
  };

  const handleVenta = async () => {
    if (!jugadorSeleccionado || !monto) return;
    setProcesando(true);
    try {
      await api.post('/ventas', {
        id_jugador: jugadorSeleccionado.id_jugador,
        monto: Number(monto),
        metodo_pago: metodo,
      });
      setVentaExitosa(true);
      setJugadorSeleccionado(null);
      setMonto('');
      setBusqueda('');
      setJugadores([]);
      setTimeout(() => setVentaExitosa(false), 3000);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error al procesar venta');
    } finally {
      setProcesando(false);
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-pearl">Venta de Fichas</h1><p className="text-silver">Registrar venta de fichas a jugadores</p></div>

      {ventaExitosa && <Alert type="success" title="Venta Exitosa">La venta se ha registrado correctamente.</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buscar Jugador */}
        <Card title="1. Seleccionar Jugador">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-silver" />
                <input type="text" placeholder="Buscar jugador..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarJugador()} className="w-full pl-10 pr-4 py-2.5 bg-slate border border-graphite rounded-lg text-pearl placeholder:text-silver/60 focus:outline-none focus:border-gold" />
              </div>
              <Button onClick={buscarJugador}>Buscar</Button>
            </div>

            {jugadores.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {jugadores.map((j) => (
                  <button key={j.id_jugador} onClick={() => { setJugadorSeleccionado(j); setJugadores([]); }} className={`w-full text-left p-3 rounded-lg border transition-all ${jugadorSeleccionado?.id_jugador === j.id_jugador ? 'border-gold bg-gold/10' : 'border-graphite hover:border-gold/50'}`}>
                    <p className="font-medium text-pearl">{j.nombre_completo}</p>
                    {j.apodo && <p className="text-sm text-silver">"{j.apodo}"</p>}
                  </button>
                ))}
              </div>
            )}

            {jugadorSeleccionado && (
              <div className="p-4 bg-gold/10 border border-gold/30 rounded-lg">
                <p className="text-sm text-gold mb-1">Jugador Seleccionado:</p>
                <p className="font-bold text-pearl">{jugadorSeleccionado.nombre_completo}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Monto y Método */}
        <Card title="2. Detalles de Venta">
          <div className="space-y-4">
            <Input label="Monto" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" leftIcon={<DollarSign className="w-5 h-5" />} />

            <div>
              <label className="block text-sm font-medium text-silver mb-2">Método de Pago</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setMetodo('EFECTIVO')} className={`p-4 rounded-lg border text-center transition-all ${metodo === 'EFECTIVO' ? 'border-gold bg-gold/10 text-gold' : 'border-graphite text-silver hover:border-gold/50'}`}>
                  <DollarSign className="w-6 h-6 mx-auto mb-1" />
                  Efectivo
                </button>
                <button onClick={() => setMetodo('TARJETA')} className={`p-4 rounded-lg border text-center transition-all ${metodo === 'TARJETA' ? 'border-gold bg-gold/10 text-gold' : 'border-graphite text-silver hover:border-gold/50'}`}>
                  <CreditCard className="w-6 h-6 mx-auto mb-1" />
                  Tarjeta
                </button>
              </div>
            </div>

            {monto && Number(monto) > 0 && (
              <div className="p-4 bg-charcoal border border-graphite rounded-lg">
                <div className="flex justify-between mb-2"><span className="text-silver">Monto:</span><span className="text-pearl">{fmt(Number(monto))}</span></div>
                <div className="flex justify-between"><span className="text-silver">Método:</span><Badge variant="gold">{metodo}</Badge></div>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handleVenta} isLoading={procesando} disabled={!jugadorSeleccionado || !monto || Number(monto) <= 0}>
              Registrar Venta
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
