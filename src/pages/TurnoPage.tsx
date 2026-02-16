import { useEffect, useState, useCallback } from 'react';
import { Clock, Play, Square, DollarSign, Users, TrendingUp, CheckCircle, Briefcase, Coins, Plus, Minus, RefreshCw, ChevronDown, ChevronUp, ArrowDownToLine } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Alert, StatCard } from '../components/ui';
import api from '../services/api';
import { fichasTurnoService, rakeService, mesaService } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Turno { id_turno: number; fecha: string; hora_inicio: string; hora_cierre: string | null; estado: string; saldo_inicial_caja: number; notas: string | null; gerente?: { id: number; nombre: string; apodo: string }; }
interface TurnoActivo { hay_turno_activo: boolean; turno?: Turno & { total_ventas: number; total_cobros: number; total_rake: number; total_propinas: number; total_gastos: number; mesas_activas: number; }; }
interface PersonalItem { id: number; nombre: string; apodo: string | null; }
interface FichaItem { id_ficha: number; denominacion: number; color: string | null; cantidad_boveda: number; cantidad_caja: number; cantidad_circulacion: number; cantidad_total: number; valor_boveda: number; valor_caja: number; valor_circulacion?: number; }
interface PreviewApertura { puede_abrir: boolean; fichas: { valor_boveda: number; valor_caja: number; valor_total: number; detalle: FichaItem[]; }; personal: { dealers: PersonalItem[]; cajeros: PersonalItem[]; gerentes: PersonalItem[]; }; }
interface FichasTurnoData { fichas: FichaItem[]; valor_boveda: number; valor_caja: number; valor_circulacion: number; valor_total: number; }
interface RakeItem { id_rake: number; monto: number; dealer: string; id_dealer: number; mesa: number | null; id_sesion: number; hora: string; notas: string | null; }
interface SesionActivaRake { id_sesion: number; mesa_numero: number; mesa_nombre: string | null; stakes: string; }
interface DealerItem { id: number; nombre: string; apodo: string | null; }

export default function TurnoPage() {
  const { isGerente } = useAuthStore();
  const [turnoActivo, setTurnoActivo] = useState<TurnoActivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fichasTurno, setFichasTurno] = useState<FichasTurnoData | null>(null);
  const [loadingFichas, setLoadingFichas] = useState(false);
  const [showCajaDetail, setShowCajaDetail] = useState(true);
  const [showCirculacionDetail, setShowCirculacionDetail] = useState(false);
  const [showBovedaDetail, setShowBovedaDetail] = useState(false);
  const [abrirModal, setAbrirModal] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewApertura | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedCajeros, setSelectedCajeros] = useState<number[]>([]);
  const [fichasACaja, setFichasACaja] = useState<Record<number, number>>({});
  const [notas, setNotas] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [cerrarModal, setCerrarModal] = useState(false);
  const [rakes, setRakes] = useState<RakeItem[]>([]);
  const [rakesTotal, setRakesTotal] = useState(0);
  const [loadingRakes, setLoadingRakes] = useState(false);
  const [showRakeHistory, setShowRakeHistory] = useState(true);
  const [rakeModal, setRakeModal] = useState(false);
  const [dealers, setDealers] = useState<DealerItem[]>([]);
  const [sesionesParaRake, setSesionesParaRake] = useState<SesionActivaRake[]>([]);
  const [rakeForm, setRakeForm] = useState({ id_sesion: 0, id_dealer: 0, notas: '' });
  const [rakeFichasDisponibles, setRakeFichasDisponibles] = useState<FichaItem[]>([]);
  const [rakeFichasSeleccion, setRakeFichasSeleccion] = useState<Record<number, number>>({});

  const fetchTurno = async () => { try { setError(null); const r = await api.get('/turnos/activo'); setTurnoActivo(r.data); } catch (err: any) { setTurnoActivo({ hay_turno_activo: false }); } finally { setLoading(false); } };
  const fetchFichasTurno = useCallback(async () => { if (!turnoActivo?.hay_turno_activo) return; setLoadingFichas(true); try { setFichasTurno(await fichasTurnoService.getFichasActivo()); } catch (e) { console.error(e); } finally { setLoadingFichas(false); } }, [turnoActivo?.hay_turno_activo]);
  const fetchRakes = useCallback(async () => { if (!turnoActivo?.hay_turno_activo) return; setLoadingRakes(true); try { const d = await rakeService.getRakes(); setRakes(d.rakes || []); setRakesTotal(d.total || 0); } catch (e) { console.error(e); } finally { setLoadingRakes(false); } }, [turnoActivo?.hay_turno_activo]);

  useEffect(() => { fetchTurno(); const i = setInterval(fetchTurno, 30000); return () => clearInterval(i); }, []);
  useEffect(() => { if (turnoActivo?.hay_turno_activo) { fetchFichasTurno(); fetchRakes(); const i = setInterval(() => { fetchFichasTurno(); fetchRakes(); }, 15000); return () => clearInterval(i); } }, [turnoActivo?.hay_turno_activo, fetchFichasTurno, fetchRakes]);

  const fetchPreviewApertura = async () => { setLoadingPreview(true); try { const r = await api.get('/turnos/preview-apertura'); setPreviewData(r.data); const init: Record<number, number> = {}; r.data.fichas.detalle.forEach((f: FichaItem) => { init[f.id_ficha] = 0; }); setFichasACaja(init); setAbrirModal(true); } catch (err: any) { alert(err.response?.data?.detail || 'Error'); } finally { setLoadingPreview(false); } };

  const handleAbrirTurno = async () => {
    setProcesando(true);
    try {
      const fa = Object.entries(fichasACaja).filter(([_, c]) => c > 0).map(([id, cantidad]) => ({ id_ficha: Number(id), cantidad }));
      await api.post('/turnos/abrir', { notas: notas || null, cajeros_ids: selectedCajeros, fichas_a_caja: fa });
      setAbrirModal(false); setNotas(''); setSelectedCajeros([]); setFichasACaja({});
      await fetchTurno();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error'); } finally { setProcesando(false); }
  };

  const handleCerrarTurno = async () => { if (!turnoActivo?.turno) return; setProcesando(true); try { await api.post(`/turnos/${turnoActivo.turno.id_turno}/cerrar`); setCerrarModal(false); await fetchTurno(); } catch (err: any) { alert(err.response?.data?.detail || 'Error al cerrar turno'); } finally { setProcesando(false); } };

  const openRakeModal = async () => {
    try {
      const [dl, ss, fichasData] = await Promise.all([rakeService.getDealers(), mesaService.getSesionesActivas(), fichasTurnoService.getFichasActivo()]);
      setDealers(dl || []); setSesionesParaRake(ss || []);
      setRakeFichasDisponibles(fichasData.fichas || []);
      const init: Record<number, number> = {};
      (fichasData.fichas || []).forEach((f: FichaItem) => { init[f.id_ficha] = 0; });
      setRakeFichasSeleccion(init);
      setRakeForm({ id_sesion: ss?.[0]?.id_sesion || 0, id_dealer: 0, notas: '' });
      setRakeModal(true);
    } catch (err: any) { alert('Error al cargar datos'); }
  };

  const rakeCalcTotal = () => rakeFichasDisponibles.reduce((t, f) => t + (f.denominacion * (rakeFichasSeleccion[f.id_ficha] || 0)), 0);
  const getRakeFichasArray = () => Object.entries(rakeFichasSeleccion).filter(([_, c]) => c > 0).map(([id, cantidad]) => ({ id_ficha: Number(id), cantidad }));

  const handleRegistrarRake = async () => {
    const fichas = getRakeFichasArray();
    if (!rakeForm.id_sesion || !rakeForm.id_dealer || fichas.length === 0) { alert('Selecciona mesa, dealer y fichas'); return; }
    setProcesando(true);
    try {
      await rakeService.registrar({ id_sesion: rakeForm.id_sesion, id_dealer: rakeForm.id_dealer, fichas, notas: rakeForm.notas || undefined });
      setRakeModal(false); setRakeForm({ id_sesion: 0, id_dealer: 0, notas: '' });
      await Promise.all([fetchRakes(), fetchFichasTurno(), fetchTurno()]);
    } catch (err: any) { alert(err.response?.data?.detail || 'Error al registrar rake'); } finally { setProcesando(false); }
  };

  const toggleCajero = (id: number) => setSelectedCajeros(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
  const updateFichaCantidad = (idFicha: number, delta: number, max: number) => setFichasACaja(p => ({ ...p, [idFicha]: Math.max(0, Math.min(max, (p[idFicha] || 0) + delta)) }));
  const setFichaCantidadVal = (idFicha: number, v: number, max: number) => setFichasACaja(p => ({ ...p, [idFicha]: Math.max(0, Math.min(max, v || 0)) }));
  const calcularTotalTransferencia = () => previewData ? previewData.fichas.detalle.reduce((t, f) => t + (f.denominacion * (fichasACaja[f.id_ficha] || 0)), 0) : 0;

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
  const fmtTime = (t: string) => t ? new Date(`2000-01-01T${t}`).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const fmtDenom = (d: number) => d >= 1000 ? `$${d/1000}K` : `$${d}`;
  const fmtHora = (iso: string) => { try { return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); } catch { return '--:--'; } };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;

  const turno = turnoActivo?.turno;
  const hayTurno = turnoActivo?.hay_turno_activo;
  const fichasCaja = fichasTurno?.fichas?.filter(f => f.cantidad_caja > 0) || [];
  const fichasCirculacion = fichasTurno?.fichas?.filter(f => f.cantidad_circulacion > 0) || [];
  const fichasBoveda = fichasTurno?.fichas?.filter(f => f.cantidad_boveda > 0) || [];

  const FichaGrid = ({ fichas, campo }: { fichas: FichaItem[]; campo: 'cantidad_caja' | 'cantidad_circulacion' | 'cantidad_boveda' }) => (
    fichas.length > 0 ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {fichas.map((f) => (
          <div key={f.id_ficha} className="p-3 bg-slate rounded-lg border border-graphite">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md" style={{ backgroundColor: f.color || '#D4AF37', color: f.denominacion >= 100 ? '#000' : '#fff' }}>{fmtDenom(f.denominacion)}</div><span className="text-xs text-silver">{fmt(f.denominacion)}</span></div>
            <p className="text-xl font-bold text-pearl">{(f as any)[campo]}</p><p className="text-xs text-silver">{fmt(f.denominacion * (f as any)[campo])}</p>
          </div>
        ))}
      </div>
    ) : <div className="text-center py-6 text-silver"><p>Sin fichas.</p></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-pearl">Gestión de Turno</h1><p className="text-silver">Control de apertura y cierre de operaciones</p></div>
        {isGerente() && (hayTurno
          ? <Button variant="danger" onClick={() => setCerrarModal(true)}><Square className="w-4 h-4" />Cerrar Turno</Button>
          : <Button onClick={fetchPreviewApertura} isLoading={loadingPreview}><Play className="w-4 h-4" />Abrir Turno</Button>
        )}
      </div>
      {error && <Alert type="error">{error}</Alert>}

      {!hayTurno ? (
        <Card className="text-center py-12"><div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/10 flex items-center justify-center"><Clock className="w-10 h-10 text-gold" /></div><h2 className="text-xl font-bold text-pearl mb-2">No hay turno activo</h2><p className="text-silver">{isGerente() ? 'Usa "Abrir Turno" para comenzar.' : 'Contacta al gerente.'}</p></Card>
      ) : turno && (<>
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4"><div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center"><Clock className="w-7 h-7 text-midnight" /></div><div><h2 className="text-xl font-bold text-pearl">Turno #{turno.id_turno}</h2><p className="text-silver">{fmtDate(turno.fecha)}</p></div></div>
            <Badge variant="success" className="text-lg px-4 py-2"><span className="w-3 h-3 bg-emerald rounded-full mr-2 animate-pulse" />EN OPERACIÓN</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-slate rounded-lg"><p className="text-sm text-silver mb-1">Inicio</p><p className="text-2xl font-bold text-pearl">{fmtTime(turno.hora_inicio)}</p></div>
            <div className="text-center p-4 bg-slate rounded-lg"><p className="text-sm text-silver mb-1">Gerente</p><p className="text-lg font-medium text-pearl">{turno.gerente?.apodo || turno.gerente?.nombre || 'N/A'}</p></div>
            <div className="text-center p-4 bg-slate rounded-lg"><p className="text-sm text-silver mb-1">Mesas</p><p className="text-2xl font-bold text-pearl">{turno.mesas_activas || 0}</p></div>
          </div>
        </Card>

        {/* RAKE MODULE */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-gold" /></div><div><h3 className="text-lg font-semibold text-pearl">Rake del Turno</h3><p className="text-sm text-silver">Cada dealer registra entrega — circulación → bóveda</p></div></div>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-gold">{fmt(rakesTotal)}</p>
              <button onClick={fetchRakes} className="p-2 rounded-lg hover:bg-white/5 text-silver hover:text-pearl" disabled={loadingRakes}><RefreshCw className={`w-4 h-4 ${loadingRakes ? 'animate-spin' : ''}`} /></button>
              <Button size="sm" onClick={openRakeModal}><Plus className="w-4 h-4" />Registrar Rake</Button>
            </div>
          </div>
          {rakes.length > 0 && (() => { const pd: Record<string, { nombre: string; total: number; count: number }> = {}; rakes.forEach(r => { if (!pd[r.id_dealer]) pd[r.id_dealer] = { nombre: r.dealer, total: 0, count: 0 }; pd[r.id_dealer].total += r.monto; pd[r.id_dealer].count += 1; }); return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">{Object.values(pd).map((d, i) => (<div key={i} className="p-3 bg-slate rounded-lg border border-graphite"><p className="text-sm font-medium text-pearl">{d.nombre}</p><p className="text-lg font-bold text-gold">{fmt(d.total)}</p><p className="text-xs text-silver">{d.count} entrega{d.count !== 1 ? 's' : ''}</p></div>))}</div>
          ); })()}
          <div className="flex items-center justify-between mb-2"><p className="text-sm text-silver font-medium">Historial ({rakes.length})</p><button onClick={() => setShowRakeHistory(!showRakeHistory)} className="p-1 rounded hover:bg-white/5 text-silver">{showRakeHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></div>
          {showRakeHistory && (rakes.length === 0
            ? <div className="text-center py-6 text-silver"><ArrowDownToLine className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No hay rakes registrados aún.</p></div>
            : <div className="space-y-2 max-h-[40vh] overflow-y-auto">{rakes.map((r) => (
                <div key={r.id_rake} className="flex items-center justify-between p-3 bg-slate rounded-lg border border-graphite hover:border-gold/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center"><DollarSign className="w-4 h-4 text-gold" /></div>
                    <div>
                      <div className="flex items-center gap-2"><p className="font-medium text-pearl">{fmt(r.monto)}</p>{r.mesa && <Badge variant="default" className="text-xs">Mesa {r.mesa}</Badge>}</div>
                      <p className="text-xs text-silver">Dealer: <span className="text-pearl">{r.dealer}</span> — {fmtHora(r.hora)}{r.notas ? ` — ${r.notas}` : ''}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gold font-medium">#{r.id_rake}</p>
                </div>
              ))}</div>
          )}
        </Card>

        {/* FICHAS EN CAJA */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-emerald/20 flex items-center justify-center"><Coins className="w-5 h-5 text-emerald" /></div><div><h3 className="text-lg font-semibold text-pearl">Fichas en Caja</h3><p className="text-sm text-silver">Disponibles para venta</p></div></div>
            <div className="flex items-center gap-3"><p className="text-2xl font-bold text-emerald">{fmt(fichasTurno?.valor_caja || 0)}</p><button onClick={fetchFichasTurno} className="p-2 rounded-lg hover:bg-white/5 text-silver" disabled={loadingFichas}><RefreshCw className={`w-4 h-4 ${loadingFichas ? 'animate-spin' : ''}`} /></button><button onClick={() => setShowCajaDetail(!showCajaDetail)} className="p-2 rounded-lg hover:bg-white/5 text-silver">{showCajaDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></div>
          </div>
          {showCajaDetail && <FichaGrid fichas={fichasCaja} campo="cantidad_caja" />}
        </Card>

        {/* FICHAS EN CIRCULACION */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center"><Users className="w-5 h-5 text-amber" /></div><div><h3 className="text-lg font-semibold text-pearl">Fichas en Circulación</h3><p className="text-sm text-silver">En manos de jugadores</p></div></div>
            <div className="flex items-center gap-3"><p className="text-2xl font-bold text-amber">{fmt(fichasTurno?.valor_circulacion || 0)}</p><button onClick={() => setShowCirculacionDetail(!showCirculacionDetail)} className="p-2 rounded-lg hover:bg-white/5 text-silver">{showCirculacionDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></div>
          </div>
          {showCirculacionDetail && <FichaGrid fichas={fichasCirculacion} campo="cantidad_circulacion" />}
        </Card>

        {/* FICHAS EN BOVEDA */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-sapphire/20 flex items-center justify-center"><Briefcase className="w-5 h-5 text-sapphire" /></div><div><h3 className="text-lg font-semibold text-pearl">Fichas en Bóveda</h3><p className="text-sm text-silver">Reserva + ganancias (rake)</p></div></div>
            <div className="flex items-center gap-3"><p className="text-2xl font-bold text-sapphire">{fmt(fichasTurno?.valor_boveda || 0)}</p><button onClick={() => setShowBovedaDetail(!showBovedaDetail)} className="p-2 rounded-lg hover:bg-white/5 text-silver">{showBovedaDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></div>
          </div>
          {showBovedaDetail && <FichaGrid fichas={fichasBoveda} campo="cantidad_boveda" />}
        </Card>

        {/* Resumen fichas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-charcoal border border-graphite rounded-xl text-center"><p className="text-xs text-silver mb-1">Caja</p><p className="text-lg font-bold text-emerald">{fmt(fichasTurno?.valor_caja || 0)}</p></div>
          <div className="p-4 bg-charcoal border border-graphite rounded-xl text-center"><p className="text-xs text-silver mb-1">Circulación</p><p className="text-lg font-bold text-amber">{fmt(fichasTurno?.valor_circulacion || 0)}</p></div>
          <div className="p-4 bg-charcoal border border-graphite rounded-xl text-center"><p className="text-xs text-silver mb-1">Bóveda</p><p className="text-lg font-bold text-sapphire">{fmt(fichasTurno?.valor_boveda || 0)}</p></div>
          <div className="p-4 bg-charcoal border border-gold/30 rounded-xl text-center"><p className="text-xs text-silver mb-1">Total</p><p className="text-lg font-bold text-gold">{fmt(fichasTurno?.valor_total || 0)}</p></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Ventas" value={fmt(turno.total_ventas)} icon={<DollarSign className="w-5 h-5" />} color="emerald" />
          <StatCard label="Cobros" value={fmt(turno.total_cobros)} icon={<DollarSign className="w-5 h-5" />} color="sapphire" />
          <StatCard label="Rake" value={fmt(turno.total_rake)} icon={<TrendingUp className="w-5 h-5" />} color="gold" />
          <StatCard label="Propinas" value={fmt(turno.total_propinas)} icon={<Users className="w-5 h-5" />} color="amber" />
          <StatCard label="Gastos" value={fmt(turno.total_gastos)} icon={<DollarSign className="w-5 h-5" />} color="ruby" />
        </div>

        {/* Resumen financiero */}
        <Card title="Resumen Financiero del Turno">
          <div className="space-y-3">
            <div className="flex justify-between py-3 border-b border-graphite"><span className="text-silver">Rake Recolectado</span><span className="text-gold font-medium">{fmt(turno.total_rake)}</span></div>
            <div className="flex justify-between py-3 border-b border-graphite"><span className="text-silver">Comisión Propinas (10%)</span><span className="text-amber font-medium">{fmt((turno.total_propinas || 0) * 0.1)}</span></div>
            <div className="flex justify-between py-3 border-b border-graphite"><span className="text-silver">Gastos Operativos</span><span className="text-ruby font-medium">-{fmt(turno.total_gastos)}</span></div>
            <div className="flex justify-between py-4 text-lg bg-slate/50 rounded-lg px-4 -mx-4"><span className="text-pearl font-bold">Ganancia Estimada</span><span className="text-gold font-bold">{fmt((turno.total_rake || 0) + (turno.total_propinas || 0) * 0.1 - (turno.total_gastos || 0))}</span></div>
          </div>
        </Card>
      </>)}

      {/* MODAL: Registrar Rake */}
      <Modal isOpen={rakeModal} onClose={() => setRakeModal(false)} title="Registrar Entrega de Rake" size="lg" footer={<><Button variant="ghost" onClick={() => setRakeModal(false)}>Cancelar</Button><Button onClick={handleRegistrarRake} isLoading={procesando} disabled={!rakeForm.id_sesion || !rakeForm.id_dealer || rakeCalcTotal() <= 0}><TrendingUp className="w-4 h-4" />Registrar ({fmt(rakeCalcTotal())})</Button></>}>
        <div className="space-y-5">
          <Alert type="info">El dealer declara las fichas exactas que entrega como rake. Pasan de circulación a bóveda.</Alert>
          <div>
            <label className="block text-sm font-medium text-silver mb-2">Mesa de origen *</label>
            {sesionesParaRake.length === 0 ? <Alert type="warning">No hay mesas activas.</Alert> : (
              <div className="grid grid-cols-2 gap-2">{sesionesParaRake.map((s) => (
                <button key={s.id_sesion} onClick={() => setRakeForm(p => ({ ...p, id_sesion: s.id_sesion }))} className={`p-3 rounded-lg border-2 text-left transition-all ${rakeForm.id_sesion === s.id_sesion ? 'border-gold bg-gold/10 text-pearl' : 'border-graphite bg-slate text-silver hover:border-gold/50'}`}>
                  <p className="font-bold">Mesa {s.mesa_numero}</p><p className="text-xs">{s.mesa_nombre || s.stakes || ''}</p>
                </button>
              ))}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-silver mb-2">Dealer que entrega *</label>
            {dealers.length === 0 ? <Alert type="warning">No hay dealers.</Alert> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{dealers.map((d) => (
                <button key={d.id} onClick={() => setRakeForm(p => ({ ...p, id_dealer: d.id }))} className={`p-3 rounded-lg border-2 text-left transition-all ${rakeForm.id_dealer === d.id ? 'border-emerald bg-emerald/10 text-pearl' : 'border-graphite bg-slate text-silver hover:border-silver'}`}>
                  <p className="font-medium">{d.apodo || d.nombre}</p>{rakeForm.id_dealer === d.id && <CheckCircle className="w-4 h-4 text-emerald mt-1" />}
                </button>
              ))}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-silver mb-2 flex items-center gap-2"><Coins className="w-4 h-4 text-gold" />Fichas del rake (desde circulación) *</label>
            <div className="p-3 bg-gold/10 rounded-lg text-center mb-3"><p className="text-sm text-silver">Total rake</p><p className="text-2xl font-bold text-gold">{fmt(rakeCalcTotal())}</p></div>
            {(() => { const fichasOrd = [...rakeFichasDisponibles].sort((a, b) => a.denominacion - b.denominacion); return fichasOrd.length === 0 ? <Alert type="warning">No hay fichas registradas.</Alert> : (
              <div className="space-y-2 max-h-[30vh] overflow-y-auto">{fichasOrd.map((ficha) => { const max = ficha.cantidad_circulacion; if (max <= 0) return (
                <div key={ficha.id_ficha} className="flex items-center justify-between p-3 rounded-lg border bg-graphite/30 border-graphite/50 opacity-50">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: ficha.color || '#D4AF37', color: ficha.denominacion >= 100 ? '#000' : '#fff' }}>{fmtDenom(ficha.denominacion)}</div><div><p className="font-medium text-pearl">{fmt(ficha.denominacion)}</p><p className="text-xs text-silver">Sin disponibles</p></div></div>
                </div>
              ); return (
                <div key={ficha.id_ficha} className="flex items-center justify-between p-3 bg-slate rounded-lg border border-graphite">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: ficha.color || '#D4AF37', color: ficha.denominacion >= 100 ? '#000' : '#fff' }}>{fmtDenom(ficha.denominacion)}</div><div><p className="font-medium text-pearl">{fmt(ficha.denominacion)}</p><p className="text-xs text-silver">Circulación: {max}</p></div></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setRakeFichasSeleccion(p => ({ ...p, [ficha.id_ficha]: Math.max(0, (p[ficha.id_ficha] || 0) - 1) }))} className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver" disabled={!(rakeFichasSeleccion[ficha.id_ficha])}><Minus className="w-4 h-4" /></button>
                    <input type="number" min="0" max={max} value={rakeFichasSeleccion[ficha.id_ficha] || 0} onChange={(e) => setRakeFichasSeleccion(p => ({ ...p, [ficha.id_ficha]: Math.max(0, Math.min(max, parseInt(e.target.value) || 0)) }))} className="w-16 h-8 text-center bg-midnight border border-graphite rounded text-pearl" />
                    <button onClick={() => setRakeFichasSeleccion(p => ({ ...p, [ficha.id_ficha]: Math.min(max, (p[ficha.id_ficha] || 0) + 1) }))} className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver" disabled={(rakeFichasSeleccion[ficha.id_ficha] || 0) >= max}><Plus className="w-4 h-4" /></button>
                    <button onClick={() => setRakeFichasSeleccion(p => ({ ...p, [ficha.id_ficha]: max }))} className="px-2 h-8 rounded bg-gold/20 hover:bg-gold/30 text-gold text-xs">Max</button>
                  </div>
                </div>
              ); })}</div>
            ); })()}
          </div>
          <Input label="Notas (opcional)" value={rakeForm.notas} onChange={(e) => setRakeForm(p => ({ ...p, notas: e.target.value }))} placeholder="Ej: Recoleccion hora 22:00..." />
          {rakeForm.id_sesion > 0 && rakeForm.id_dealer > 0 && rakeCalcTotal() > 0 && (
            <div className="p-4 bg-gold/10 rounded-lg border border-gold/30">
              <h4 className="font-semibold text-gold mb-2">Confirmar entrega</h4>
              <div className="text-sm text-pearl space-y-1">
                <p>Mesa: <strong>{sesionesParaRake.find(s => s.id_sesion === rakeForm.id_sesion)?.mesa_numero}</strong></p>
                <p>Dealer: <strong>{dealers.find(d => d.id === rakeForm.id_dealer)?.apodo || dealers.find(d => d.id === rakeForm.id_dealer)?.nombre}</strong></p>
                <p>Monto: <strong className="text-gold">{fmt(rakeCalcTotal())}</strong></p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL: Abrir Turno */}
      <Modal isOpen={abrirModal} onClose={() => setAbrirModal(false)} title="Abrir Nuevo Turno" size="lg" footer={<><Button variant="ghost" onClick={() => setAbrirModal(false)}>Cancelar</Button><Button onClick={handleAbrirTurno} isLoading={procesando} disabled={!previewData?.puede_abrir}><Play className="w-4 h-4" />Iniciar Turno</Button></>}>
        {previewData && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {!previewData.puede_abrir && <Alert type="error" title="No se puede abrir turno">Ya existe un turno activo.</Alert>}
            <div>
              <h3 className="text-lg font-semibold text-pearl mb-3 flex items-center gap-2"><Coins className="w-5 h-5 text-gold" />Fichas para Caja</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-slate rounded-lg text-center"><p className="text-silver text-sm">Bóveda</p><p className="text-lg font-bold text-gold">{fmt(previewData.fichas.valor_boveda)}</p></div>
                <div className="p-3 bg-slate rounded-lg text-center"><p className="text-silver text-sm">Caja Actual</p><p className="text-lg font-bold text-emerald">{fmt(previewData.fichas.valor_caja)}</p></div>
                <div className="p-3 bg-slate rounded-lg text-center"><p className="text-silver text-sm">A Transferir</p><p className="text-lg font-bold text-sapphire">{fmt(calcularTotalTransferencia())}</p></div>
              </div>
              <div className="space-y-2">{previewData.fichas.detalle.map((ficha) => (
                <div key={ficha.id_ficha} className="flex items-center justify-between p-3 bg-slate rounded-lg border border-graphite">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: ficha.color || '#D4AF37', color: ficha.denominacion >= 100 ? '#000' : '#fff' }}>{fmtDenom(ficha.denominacion)}</div>
                    <div><p className="font-medium text-pearl">{fmt(ficha.denominacion)}</p><p className="text-xs text-silver">Bóveda: {ficha.cantidad_boveda} | Caja: {ficha.cantidad_caja}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateFichaCantidad(ficha.id_ficha, -10, ficha.cantidad_boveda)} className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver" disabled={!fichasACaja[ficha.id_ficha]}>-10</button>
                    <button onClick={() => updateFichaCantidad(ficha.id_ficha, -1, ficha.cantidad_boveda)} className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver" disabled={!fichasACaja[ficha.id_ficha]}><Minus className="w-4 h-4" /></button>
                    <input type="number" min="0" max={ficha.cantidad_boveda} value={fichasACaja[ficha.id_ficha] || 0} onChange={(e) => setFichaCantidadVal(ficha.id_ficha, parseInt(e.target.value), ficha.cantidad_boveda)} className="w-16 h-8 text-center bg-midnight border border-graphite rounded text-pearl" />
                    <button onClick={() => updateFichaCantidad(ficha.id_ficha, 1, ficha.cantidad_boveda)} className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver" disabled={(fichasACaja[ficha.id_ficha] || 0) >= ficha.cantidad_boveda}><Plus className="w-4 h-4" /></button>
                    <button onClick={() => updateFichaCantidad(ficha.id_ficha, 10, ficha.cantidad_boveda)} className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver" disabled={(fichasACaja[ficha.id_ficha] || 0) >= ficha.cantidad_boveda}>+10</button>
                    <button onClick={() => setFichaCantidadVal(ficha.id_ficha, ficha.cantidad_boveda, ficha.cantidad_boveda)} className="px-2 h-8 rounded bg-gold/20 hover:bg-gold/30 text-gold text-xs">Todo</button>
                  </div>
                </div>
              ))}</div>
            </div>
            {/* CAJEROS - Solo cajeros, dealers se asignan por mesa */}
            <div>
              <h3 className="text-lg font-semibold text-pearl mb-3 flex items-center gap-2"><DollarSign className="w-5 h-5 text-sapphire" />Cajeros{selectedCajeros.length > 0 && <Badge variant="info">{selectedCajeros.length}</Badge>}</h3>
              {previewData.personal.cajeros.length === 0 ? <p className="text-silver text-sm">No hay cajeros</p> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{previewData.personal.cajeros.map((c) => (
                  <button key={c.id} onClick={() => toggleCajero(c.id)} className={`p-3 rounded-lg border-2 text-left ${selectedCajeros.includes(c.id) ? 'border-sapphire bg-sapphire/10 text-pearl' : 'border-graphite bg-slate text-silver hover:border-silver'}`}><p className="font-medium">{c.apodo || c.nombre}</p>{selectedCajeros.includes(c.id) && <CheckCircle className="w-4 h-4 text-sapphire mt-1" />}</button>
                ))}</div>
              )}
              <p className="text-xs text-silver mt-2 italic">Los dealers se asignan directamente en cada mesa al iniciar la sesión.</p>
            </div>
            <Input label="Notas del Turno (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." />
            <div className="p-4 bg-gold/10 rounded-lg border border-gold/30">
              <h4 className="font-semibold text-gold mb-2">Resumen</h4>
              <ul className="text-sm text-pearl space-y-1">
                <li>Caja actual: {fmt(previewData.fichas.valor_caja)}</li>
                <li>A Transferir: {fmt(calcularTotalTransferencia())}</li>
                <li><strong>Total Caja: {fmt(previewData.fichas.valor_caja + calcularTotalTransferencia())}</strong></li>
                <li>Cajeros: {selectedCajeros.length}</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Cerrar Turno */}
      <Modal isOpen={cerrarModal} onClose={() => setCerrarModal(false)} title="Cerrar Turno" footer={<><Button variant="ghost" onClick={() => setCerrarModal(false)}>Cancelar</Button><Button variant="danger" onClick={handleCerrarTurno} isLoading={procesando}><Square className="w-4 h-4" />Confirmar Cierre</Button></>}>
        <Alert type="warning" title="¿Cerrar turno?">Deben estar cerradas todas las mesas y todos los jugadores con cashout.</Alert>
        {turno && (
          <div className="mt-4 p-4 bg-slate rounded-lg">
            <h4 className="font-medium text-pearl mb-2">Resumen:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-silver">Rake:</div><div className="text-gold font-medium">{fmt(turno.total_rake)}</div>
              <div className="text-silver">Propinas:</div><div className="text-pearl">{fmt(turno.total_propinas)}</div>
              <div className="text-silver">Gastos:</div><div className="text-ruby">{fmt(turno.total_gastos)}</div>
              <div className="text-silver">Fichas circulación:</div><div className="text-amber">{fmt(fichasTurno?.valor_circulacion || 0)}</div>
            </div>
            {(fichasTurno?.valor_circulacion || 0) > 0 && <p className="text-xs text-amber mt-3">⚠️ Quedan fichas en circulación — jugadores se llevaron fichas.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}