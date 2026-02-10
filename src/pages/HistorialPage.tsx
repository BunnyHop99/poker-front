import { useEffect, useState } from 'react';
import { Clock, DollarSign, TrendingUp, ChevronLeft, ChevronRight, Filter, CreditCard, CheckCircle, AlertTriangle, Receipt, RefreshCw, Layers } from 'lucide-react';
import { Button, Card, Badge, Modal, Alert } from '../components/ui';
import { historialService } from '../services/api';

type Tab = 'turnos' | 'ventas' | 'creditos';

interface TurnoHist { id_turno: number; fecha: string; hora_inicio: string | null; hora_cierre: string | null; estado: string; gerente: string; total_ventas: number; total_cobros: number; total_rake: number; total_mesas: number; ganancia: number; }
interface VentaHist { id_venta: number; fecha: string; jugador: string; id_jugador: number; cajero: string; monto: number; metodo_pago: string; estado_pago: string; es_recompra: boolean; es_promocion: boolean; referencia_pago: string | null; id_turno: number; turno_fecha: string | null; }

export default function HistorialPage() {
  const [tab, setTab] = useState<Tab>('turnos');
  const [loading, setLoading] = useState(false);
  // Turnos
  const [turnos, setTurnos] = useState<TurnoHist[]>([]);
  const [turnosTotal, setTurnosTotal] = useState(0);
  const [turnosPage, setTurnosPage] = useState(0);
  // Ventas
  const [ventas, setVentas] = useState<VentaHist[]>([]);
  const [ventasTotal, setVentasTotal] = useState(0);
  const [ventasPage, setVentasPage] = useState(0);
  // Créditos pendientes
  const [creditos, setCreditos] = useState<VentaHist[]>([]);
  const [creditosTotal, setCreditosTotal] = useState(0);
  const [creditosPage, setCreditosPage] = useState(0);
  // Confirmar pago
  const [confirmarModal, setConfirmarModal] = useState<VentaHist | null>(null);
  const [procesando, setProcesando] = useState(false);

  const PAGE_SIZE = 20;
  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; } };
  const fmtDateTime = (d: string) => { try { const dt = new Date(d); return dt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) + ' ' + dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); } catch { return d; } };
  const fmtTime = (t: string | null) => { if (!t) return '--:--'; try { return new Date(`2000-01-01T${t}`).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); } catch { return t; } };

  const fetchTurnos = async (page = 0) => {
    setLoading(true);
    try {
      const data = await historialService.getTurnos(PAGE_SIZE, page * PAGE_SIZE);
      setTurnos(data.turnos); setTurnosTotal(data.total); setTurnosPage(page);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchVentas = async (page = 0) => {
    setLoading(true);
    try {
      const data = await historialService.getVentas(PAGE_SIZE, page * PAGE_SIZE);
      setVentas(data.ventas); setVentasTotal(data.total); setVentasPage(page);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchCreditos = async (page = 0) => {
    setLoading(true);
    try {
      const data = await historialService.getVentas(PAGE_SIZE, page * PAGE_SIZE, true, true);
      setCreditos(data.ventas); setCreditosTotal(data.total); setCreditosPage(page);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'turnos') fetchTurnos(0);
    else if (tab === 'ventas') fetchVentas(0);
    else fetchCreditos(0);
  }, [tab]);

  const handleMarcarPagado = async () => {
    if (!confirmarModal) return;
    setProcesando(true);
    try {
      await historialService.marcarPagado(confirmarModal.id_venta);
      setConfirmarModal(null);
      fetchCreditos(creditosPage);
      fetchVentas(ventasPage);
    } catch (err: any) { alert(err.response?.data?.detail || 'Error al marcar como pagado'); } finally { setProcesando(false); }
  };

  const totalPages = (total: number) => Math.ceil(total / PAGE_SIZE);

  const Pagination = ({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) => {
    const tp = totalPages(total);
    if (tp <= 1) return null;
    return (
      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-silver">Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} de {total}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => onPage(page - 1)} disabled={page === 0} className="p-2 rounded-lg border border-graphite text-silver hover:text-pearl disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-pearl px-3">{page + 1} / {tp}</span>
          <button onClick={() => onPage(page + 1)} disabled={page >= tp - 1} className="p-2 rounded-lg border border-graphite text-silver hover:text-pearl disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };

  const metodoBadge = (m: string) => {
    if (m === 'EFECTIVO') return <Badge variant="success">Efectivo</Badge>;
    if (m === 'TARJETA') return <Badge variant="info">Tarjeta</Badge>;
    if (m === 'CREDITO') return <Badge variant="warning">Crédito</Badge>;
    return <Badge variant="default">{m}</Badge>;
  };

  const estadoBadge = (e: string) => {
    if (e === 'PENDIENTE') return <Badge variant="warning">Pendiente</Badge>;
    if (e === 'AUTORIZADO') return <Badge variant="success">Pagado</Badge>;
    if (e === 'RECHAZADO') return <Badge variant="error">Rechazado</Badge>;
    return <Badge variant="default">{e}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-pearl">Historial</h1><p className="text-silver">Turnos, compras de fichas y créditos pendientes</p></div>
        <button onClick={() => { if (tab === 'turnos') fetchTurnos(turnosPage); else if (tab === 'ventas') fetchVentas(ventasPage); else fetchCreditos(creditosPage); }} className="p-2 rounded-lg hover:bg-white/5 text-silver hover:text-pearl" disabled={loading}><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-charcoal rounded-xl p-1 border border-graphite">
        {([
          { key: 'turnos' as Tab, label: 'Turnos', icon: <Clock className="w-4 h-4" />, count: turnosTotal },
          { key: 'ventas' as Tab, label: 'Compras', icon: <Receipt className="w-4 h-4" />, count: ventasTotal },
          { key: 'creditos' as Tab, label: 'Créditos Pendientes', icon: <AlertTriangle className="w-4 h-4" />, count: creditosTotal },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gold/10 text-gold' : 'text-silver hover:text-pearl hover:bg-white/5'}`}>
            {t.icon}{t.label}{t.key === 'creditos' && t.count > 0 && <span className="ml-1 px-2 py-0.5 bg-ruby/20 text-ruby text-xs rounded-full font-bold">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" /></div>}

      {/* TAB: TURNOS */}
      {!loading && tab === 'turnos' && (
        <Card noPadding>
          {turnos.length === 0 ? <div className="p-8 text-center text-silver">No hay turnos registrados.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-graphite">
                  <th className="text-left p-4 text-silver font-medium">#</th>
                  <th className="text-left p-4 text-silver font-medium">Fecha</th>
                  <th className="text-left p-4 text-silver font-medium">Horario</th>
                  <th className="text-left p-4 text-silver font-medium">Gerente</th>
                  <th className="text-left p-4 text-silver font-medium">Estado</th>
                  <th className="text-right p-4 text-silver font-medium">Mesas</th>
                  <th className="text-right p-4 text-silver font-medium">Ventas</th>
                  <th className="text-right p-4 text-silver font-medium">Cobros</th>
                  <th className="text-right p-4 text-silver font-medium">Rake</th>
                </tr></thead>
                <tbody>
                  {turnos.map(t => (
                    <tr key={t.id_turno} className="border-b border-graphite/50 hover:bg-white/[0.02]">
                      <td className="p-4 font-bold text-gold">{t.id_turno}</td>
                      <td className="p-4 text-pearl">{fmtDate(t.fecha)}</td>
                      <td className="p-4 text-pearl">{fmtTime(t.hora_inicio)}{t.hora_cierre ? ` - ${fmtTime(t.hora_cierre)}` : ''}</td>
                      <td className="p-4 text-pearl">{t.gerente}</td>
                      <td className="p-4">{t.estado === 'ABIERTO' ? <Badge variant="success">Abierto</Badge> : t.estado === 'CERRADO' ? <Badge variant="default">Cerrado</Badge> : <Badge variant="warning">{t.estado}</Badge>}</td>
                      <td className="p-4 text-right text-pearl">{t.total_mesas}</td>
                      <td className="p-4 text-right text-emerald font-medium">{fmt(t.total_ventas)}</td>
                      <td className="p-4 text-right text-sapphire font-medium">{fmt(t.total_cobros)}</td>
                      <td className="p-4 text-right text-gold font-medium">{fmt(t.total_rake)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 pb-4"><Pagination page={turnosPage} total={turnosTotal} onPage={fetchTurnos} /></div>
        </Card>
      )}

      {/* TAB: VENTAS */}
      {!loading && tab === 'ventas' && (
        <Card noPadding>
          {ventas.length === 0 ? <div className="p-8 text-center text-silver">No hay compras registradas.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-graphite">
                  <th className="text-left p-4 text-silver font-medium">#</th>
                  <th className="text-left p-4 text-silver font-medium">Fecha</th>
                  <th className="text-left p-4 text-silver font-medium">Jugador</th>
                  <th className="text-left p-4 text-silver font-medium">Cajero</th>
                  <th className="text-right p-4 text-silver font-medium">Monto</th>
                  <th className="text-center p-4 text-silver font-medium">Método</th>
                  <th className="text-center p-4 text-silver font-medium">Estado</th>
                  <th className="text-center p-4 text-silver font-medium">Tipo</th>
                  <th className="text-left p-4 text-silver font-medium">Turno</th>
                </tr></thead>
                <tbody>
                  {ventas.map(v => (
                    <tr key={v.id_venta} className="border-b border-graphite/50 hover:bg-white/[0.02]">
                      <td className="p-4 text-silver">{v.id_venta}</td>
                      <td className="p-4 text-pearl">{fmtDateTime(v.fecha)}</td>
                      <td className="p-4 text-pearl font-medium">{v.jugador}</td>
                      <td className="p-4 text-silver">{v.cajero}</td>
                      <td className="p-4 text-right text-pearl font-bold">{fmt(v.monto)}</td>
                      <td className="p-4 text-center">{metodoBadge(v.metodo_pago)}</td>
                      <td className="p-4 text-center">{estadoBadge(v.estado_pago)}</td>
                      <td className="p-4 text-center">{v.es_recompra ? <Badge variant="info">Recompra</Badge> : v.es_promocion ? <Badge variant="warning">Promo</Badge> : <Badge variant="default">Buy-in</Badge>}</td>
                      <td className="p-4 text-silver">#{v.id_turno}{v.turno_fecha ? ` (${fmtDate(v.turno_fecha)})` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 pb-4"><Pagination page={ventasPage} total={ventasTotal} onPage={fetchVentas} /></div>
        </Card>
      )}

      {/* TAB: CRÉDITOS PENDIENTES */}
      {!loading && tab === 'creditos' && (
        <>
          {creditosTotal > 0 && (
            <div className="p-4 bg-ruby/10 border border-ruby/30 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-ruby flex-shrink-0" />
              <div>
                <p className="font-semibold text-pearl">{creditosTotal} crédito{creditosTotal !== 1 ? 's' : ''} pendiente{creditosTotal !== 1 ? 's' : ''}</p>
                <p className="text-sm text-silver">Total adeudado: <span className="text-ruby font-bold">{fmt(creditos.reduce((s, c) => s + c.monto, 0))}</span></p>
              </div>
            </div>
          )}
          <Card noPadding>
            {creditos.length === 0 ? <div className="p-8 text-center text-silver"><CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald opacity-50" /><p className="text-lg font-medium text-pearl">Sin créditos pendientes</p><p>Todas las compras a crédito han sido pagadas.</p></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-graphite">
                    <th className="text-left p-4 text-silver font-medium">Fecha</th>
                    <th className="text-left p-4 text-silver font-medium">Jugador</th>
                    <th className="text-right p-4 text-silver font-medium">Monto</th>
                    <th className="text-left p-4 text-silver font-medium">Cajero</th>
                    <th className="text-left p-4 text-silver font-medium">Turno</th>
                    <th className="text-center p-4 text-silver font-medium">Tipo</th>
                    <th className="text-center p-4 text-silver font-medium">Acción</th>
                  </tr></thead>
                  <tbody>
                    {creditos.map(c => (
                      <tr key={c.id_venta} className="border-b border-graphite/50 hover:bg-white/[0.02]">
                        <td className="p-4 text-pearl">{fmtDateTime(c.fecha)}</td>
                        <td className="p-4 text-pearl font-bold">{c.jugador}</td>
                        <td className="p-4 text-right text-ruby font-bold text-lg">{fmt(c.monto)}</td>
                        <td className="p-4 text-silver">{c.cajero}</td>
                        <td className="p-4 text-silver">#{c.id_turno}</td>
                        <td className="p-4 text-center">{c.es_recompra ? <Badge variant="info">Recompra</Badge> : <Badge variant="default">Buy-in</Badge>}</td>
                        <td className="p-4 text-center"><Button size="sm" onClick={() => setConfirmarModal(c)}><CheckCircle className="w-4 h-4" />Marcar Pagado</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-4 pb-4"><Pagination page={creditosPage} total={creditosTotal} onPage={fetchCreditos} /></div>
          </Card>
        </>
      )}

      {/* Modal confirmar pago */}
      <Modal isOpen={!!confirmarModal} onClose={() => setConfirmarModal(null)} title="Confirmar Pago de Crédito" footer={<><Button variant="ghost" onClick={() => setConfirmarModal(null)}>Cancelar</Button><Button onClick={handleMarcarPagado} isLoading={procesando}><CheckCircle className="w-4 h-4" />Confirmar Pago</Button></>}>
        {confirmarModal && (
          <div className="space-y-4">
            <Alert type="info">Al confirmar, el crédito se marcará como pagado y se reducirá el saldo de crédito del jugador.</Alert>
            <div className="p-4 bg-slate rounded-lg space-y-2">
              <div className="flex justify-between"><span className="text-silver">Jugador:</span><span className="text-pearl font-bold">{confirmarModal.jugador}</span></div>
              <div className="flex justify-between"><span className="text-silver">Monto:</span><span className="text-gold font-bold text-lg">{fmt(confirmarModal.monto)}</span></div>
              <div className="flex justify-between"><span className="text-silver">Fecha compra:</span><span className="text-pearl">{fmtDateTime(confirmarModal.fecha)}</span></div>
              <div className="flex justify-between"><span className="text-silver">Tipo:</span><span className="text-pearl">{confirmarModal.es_recompra ? 'Recompra' : 'Buy-in'}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}