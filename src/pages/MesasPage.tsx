import { useEffect, useState } from 'react';
import { Play, Square, Users, Clock, DollarSign, Plus, Edit, Trash2, Search, UserPlus, LogOut, Coins, Minus } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Table, Alert } from '../components/ui';
import { mesaService, jugadorService, fichasTurnoService } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Mesa { id_mesa: number; numero_mesa: number; nombre: string | null; capacidad: number; tipo_juego: string; activa: boolean; }
interface SesionActiva { id_sesion: number; id_mesa: number; mesa_numero: number; mesa_nombre: string; stakes: string; hora_inicio: string; estado: string; jugadores_count: number; total_rake: number; }
interface JugadorEnSesion { id: number; id_jugador: number; nombre: string; apodo: string | null; asiento: number | null; hora_entrada: string; hora_salida: string | null; buy_in_total: number; cash_out: number | null; resultado: number | null; }
interface SesionDetalle { id_sesion: number; id_mesa: number; mesa: { id_mesa: number; numero_mesa: number; nombre: string | null }; stakes: string; hora_inicio: string; estado: string; jugadores: JugadorEnSesion[]; jugadores_actuales: number; }
interface JugadorBusqueda { id_jugador: number; nombre_completo: string; apodo: string | null; }
interface FichaItem { id_ficha: number; denominacion: number; color: string | null; cantidad_caja: number; cantidad_circulacion: number; }

export default function MesasPage() {
  const { isGerente } = useAuthStore();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [sesionesActivas, setSesionesActivas] = useState<SesionActiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crearMesaModal, setCrearMesaModal] = useState(false);
  const [editarMesaModal, setEditarMesaModal] = useState<Mesa | null>(null);
  const [iniciarSesionModal, setIniciarSesionModal] = useState<Mesa | null>(null);
  const [mesaForm, setMesaForm] = useState({ numero_mesa: '', nombre: '', capacidad: '9', tipo_juego: 'NLHE' });
  const [stakes, setStakes] = useState('1/2');
  const [procesando, setProcesando] = useState(false);
  const [sesionDetalle, setSesionDetalle] = useState<SesionDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [fichasDisponibles, setFichasDisponibles] = useState<FichaItem[]>([]);
  const [fichasSeleccion, setFichasSeleccion] = useState<Record<number, number>>({});
  const [loadingFichas, setLoadingFichas] = useState(false);
  const [sentarModal, setSentarModal] = useState<number | null>(null);
  const [busquedaJugador, setBusquedaJugador] = useState('');
  const [jugadoresEncontrados, setJugadoresEncontrados] = useState<JugadorBusqueda[]>([]);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<JugadorBusqueda | null>(null);
  const [buyInMetodo, setBuyInMetodo] = useState('EFECTIVO');
  const [asiento, setAsiento] = useState('');
  const [cashoutModal, setCashoutModal] = useState<{ sesion: number; jugadorSesion: JugadorEnSesion } | null>(null);
  const [cashoutMetodo, setCashoutMetodo] = useState('EFECTIVO');
  const [recompraModal, setRecompraModal] = useState<{ sesion: number; jugadorSesion: JugadorEnSesion } | null>(null);
  const [recompraMetodo, setRecompraMetodo] = useState('EFECTIVO');

  const fetchData = async () => {
    try {
      setError(null);
      const [mesasData, sesionesData] = await Promise.all([mesaService.getAll(), mesaService.getSesionesActivas()]);
      setMesas(mesasData || []); setSesionesActivas(sesionesData || []);
    } catch (err: any) { console.error(err); setError(err.response?.data?.detail || 'Error al cargar datos'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const loadFichas = async () => {
    setLoadingFichas(true);
    try {
      const data = await fichasTurnoService.getFichasActivo();
      setFichasDisponibles(data.fichas || []);
      const init: Record<number, number> = {};
      (data.fichas || []).forEach((f: FichaItem) => { init[f.id_ficha] = 0; });
      setFichasSeleccion(init);
    } catch (err) { console.error(err); } finally { setLoadingFichas(false); }
  };

  const resetMesaForm = () => setMesaForm({ numero_mesa: '', nombre: '', capacidad: '9', tipo_juego: 'NLHE' });
  const calcTotalSeleccion = () => fichasDisponibles.reduce((t, f) => t + (f.denominacion * (fichasSeleccion[f.id_ficha] || 0)), 0);
  const getFichasArray = () => Object.entries(fichasSeleccion).filter(([_, c]) => c > 0).map(([id, cantidad]) => ({ id_ficha: Number(id), cantidad }));

  const handleCrearMesa = async () => {
    if (!mesaForm.numero_mesa) { alert('Número requerido'); return; }
    setProcesando(true);
    try {
      const d: any = { numero_mesa: Number(mesaForm.numero_mesa), capacidad: Number(mesaForm.capacidad) || 9, tipo_juego: mesaForm.tipo_juego || 'NLHE' };
      if (mesaForm.nombre?.trim()) d.nombre = mesaForm.nombre.trim();
      await mesaService.crear(d); setCrearMesaModal(false); resetMesaForm(); await fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error'); } finally { setProcesando(false); }
  };

  const handleEditarMesa = async () => {
    if (!editarMesaModal) return; setProcesando(true);
    try { await mesaService.actualizar(editarMesaModal.id_mesa, { nombre: mesaForm.nombre || null, capacidad: Number(mesaForm.capacidad), activa: editarMesaModal.activa }); setEditarMesaModal(null); resetMesaForm(); await fetchData(); } catch (err: any) { alert(err.response?.data?.detail || 'Error'); } finally { setProcesando(false); }
  };

  const handleToggleActiva = async (mesa: Mesa) => { try { await mesaService.actualizar(mesa.id_mesa, { activa: !mesa.activa }); await fetchData(); } catch (err: any) { alert(err.response?.data?.detail || 'Error'); } };

  const handleIniciarSesion = async () => {
    if (!iniciarSesionModal) return; setProcesando(true);
    try { await mesaService.iniciarSesion(iniciarSesionModal.id_mesa, stakes); setIniciarSesionModal(null); setStakes('1/2'); await fetchData(); } catch (err: any) { alert(err.response?.data?.detail || 'Error'); } finally { setProcesando(false); }
  };

  const handleCerrarSesion = async (idSesion: number) => {
    if (!confirm('¿Cerrar esta sesión de mesa?')) return;
    try { await mesaService.cerrarSesion(idSesion); setSesionDetalle(null); await fetchData(); } catch (err: any) { alert(err.response?.data?.detail || 'Error: ' + (err.response?.data?.detail || '')); }
  };

  const openEditModal = (mesa: Mesa) => { setMesaForm({ numero_mesa: String(mesa.numero_mesa), nombre: mesa.nombre || '', capacidad: String(mesa.capacidad), tipo_juego: mesa.tipo_juego || 'NLHE' }); setEditarMesaModal(mesa); };
  const fetchSesionDetalle = async (idSesion: number) => { setLoadingDetalle(true); try { setSesionDetalle(await mesaService.getSesionDetalle(idSesion)); } catch (err: any) { alert(err.response?.data?.detail || 'Error'); } finally { setLoadingDetalle(false); } };
  const buscarJugador = async () => { if (!busquedaJugador.trim()) return; try { setJugadoresEncontrados(await jugadorService.buscar(busquedaJugador)); } catch (e) { console.error(e); } };
  const openSentarModal = (idSesion: number) => { setSentarModal(idSesion); loadFichas(); };
  const openCashoutModal = (sesion: number, js: JugadorEnSesion) => { setCashoutModal({ sesion, jugadorSesion: js }); loadFichas(); };
  const openRecompraModal = (sesion: number, js: JugadorEnSesion) => { setRecompraModal({ sesion, jugadorSesion: js }); loadFichas(); };

  const handleSentarJugador = async () => {
    if (!sentarModal || !jugadorSeleccionado) return;
    const fichas = getFichasArray();
    if (fichas.length === 0) { alert('Selecciona las fichas para el buy-in'); return; }
    setProcesando(true);
    try {
      await mesaService.sentarJugador(sentarModal, { id_jugador: jugadorSeleccionado.id_jugador, asiento: asiento ? Number(asiento) : undefined, fichas, metodo_pago: buyInMetodo });
      setSentarModal(null); setJugadorSeleccionado(null); setBusquedaJugador(''); setJugadoresEncontrados([]); setAsiento('');
      if (sesionDetalle) await fetchSesionDetalle(sesionDetalle.id_sesion);
      await fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error al sentar jugador'); } finally { setProcesando(false); }
  };

  const handleCashout = async () => {
    if (!cashoutModal) return;
    const fichas = getFichasArray();
    if (fichas.length === 0) { alert('Cuenta las fichas del jugador'); return; }
    setProcesando(true);
    try {
      await mesaService.cashoutJugador(cashoutModal.sesion, cashoutModal.jugadorSesion.id, { fichas, metodo_cobro: cashoutMetodo });
      setCashoutModal(null);
      if (sesionDetalle) await fetchSesionDetalle(sesionDetalle.id_sesion);
      await fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error en cashout'); } finally { setProcesando(false); }
  };

  const handleRecompra = async () => {
    if (!recompraModal) return;
    const fichas = getFichasArray();
    if (fichas.length === 0) { alert('Selecciona fichas'); return; }
    setProcesando(true);
    try {
      await mesaService.recompraJugador(recompraModal.sesion, recompraModal.jugadorSesion.id, { fichas, metodo_pago: recompraMetodo });
      setRecompraModal(null);
      if (sesionDetalle) await fetchSesionDetalle(sesionDetalle.id_sesion);
      await fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error'); } finally { setProcesando(false); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
  const fmtTime = (t: string) => new Date(t).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const getMesaSesion = (idMesa: number) => sesionesActivas.find((s) => s.id_mesa === idMesa);
  const fmtDenom = (d: number) => d >= 1000 ? `$${d/1000}K` : `$${d}`;

  const DenominacionSelector = ({ modo }: { modo: 'caja' | 'circulacion' }) => {
    const getMax = (f: FichaItem) => modo === 'caja' ? f.cantidad_caja : f.cantidad_circulacion;
    const fichasOrdenadas = [...fichasDisponibles].sort((a, b) => a.denominacion - b.denominacion);
    return (
      <div className="space-y-4">
        <div className="p-3 bg-gold/10 rounded-lg text-center">
          <p className="text-sm text-silver">Total seleccionado</p>
          <p className="text-2xl font-bold text-gold">{fmt(calcTotalSeleccion())}</p>
        </div>
        {loadingFichas ? <div className="flex justify-center py-6"><div className="w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin" /></div>
        : fichasOrdenadas.length === 0 ? <Alert type="warning">No hay fichas registradas.</Alert>
        : (
          <div className="space-y-2 max-h-[35vh] overflow-y-auto">
            {fichasOrdenadas.map((ficha) => { const max = getMax(ficha); const disabled = max <= 0; return (
              <div key={ficha.id_ficha} className={`flex items-center justify-between p-3 rounded-lg border ${disabled ? 'bg-graphite/30 border-graphite/50 opacity-50' : 'bg-slate border-graphite'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: ficha.color || '#D4AF37', color: ficha.denominacion >= 100 ? '#000' : '#fff' }}>{fmtDenom(ficha.denominacion)}</div>
                  <div><p className="font-medium text-pearl">{fmt(ficha.denominacion)}</p><p className="text-xs text-silver">{disabled ? 'Sin disponibles' : `Disponibles: ${max}`}</p></div>
                </div>
                {!disabled && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFichasSeleccion(prev => ({ ...prev, [ficha.id_ficha]: Math.max(0, (prev[ficha.id_ficha] || 0) - 1) }))} className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver" disabled={!(fichasSeleccion[ficha.id_ficha])}><Minus className="w-4 h-4" /></button>
                    <input type="number" min="0" max={max} value={fichasSeleccion[ficha.id_ficha] || 0} onChange={(e) => setFichasSeleccion(prev => ({ ...prev, [ficha.id_ficha]: Math.max(0, Math.min(max, parseInt(e.target.value) || 0)) }))} className="w-16 h-8 text-center bg-midnight border border-graphite rounded text-pearl" />
                    <button onClick={() => setFichasSeleccion(prev => ({ ...prev, [ficha.id_ficha]: Math.min(max, (prev[ficha.id_ficha] || 0) + 1) }))} className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver" disabled={(fichasSeleccion[ficha.id_ficha] || 0) >= max}><Plus className="w-4 h-4" /></button>
                    <button onClick={() => setFichasSeleccion(prev => ({ ...prev, [ficha.id_ficha]: max }))} className="px-2 h-8 rounded bg-gold/20 hover:bg-gold/30 text-gold text-xs">Max</button>
                  </div>
                )}
              </div>
            ); })}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-pearl">Mesas</h1><p className="text-silver">Gestión de mesas y sesiones de juego</p></div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{sesionesActivas.length} mesas activas</Badge>
          {isGerente() && <Button onClick={() => { resetMesaForm(); setCrearMesaModal(true); }}><Plus className="w-4 h-4" />Nueva Mesa</Button>}
        </div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {sesionesActivas.length > 0 && (<>
        <h2 className="text-lg font-semibold text-pearl">Mesas en Juego</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sesionesActivas.map((sesion) => (
            <Card key={sesion.id_sesion} className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full -mr-12 -mt-12" />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div><h3 className="text-lg font-bold text-pearl">Mesa {sesion.mesa_numero}</h3><p className="text-silver text-sm">{sesion.mesa_nombre || 'Sin nombre'}</p></div>
                  <Badge variant="success">En Juego</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-pearl"><Users className="w-4 h-4 text-silver" />{sesion.jugadores_count} jugadores</div>
                  <div className="flex items-center gap-2 text-pearl"><Clock className="w-4 h-4 text-silver" />{fmtTime(sesion.hora_inicio)}</div>
                  <div className="flex items-center gap-2 text-pearl"><DollarSign className="w-4 h-4 text-silver" />Stakes: {sesion.stakes}</div>
                  <div className="flex items-center gap-2 text-gold font-medium"><DollarSign className="w-4 h-4" />Rake: {fmt(sesion.total_rake)}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => fetchSesionDetalle(sesion.id_sesion)}><Users className="w-4 h-4" />Ver Jugadores</Button>
                  <Button size="sm" onClick={() => openSentarModal(sesion.id_sesion)}><UserPlus className="w-4 h-4" />Sentar</Button>
                  {isGerente() && <Button variant="danger" size="sm" onClick={() => handleCerrarSesion(sesion.id_sesion)}><Square className="w-4 h-4" />Cerrar</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </>)}
      {sesionDetalle && (
        <Card title={`Mesa ${sesionDetalle.mesa.numero_mesa} - Jugadores`} action={<div className="flex gap-2"><Button size="sm" onClick={() => openSentarModal(sesionDetalle.id_sesion)}><UserPlus className="w-4 h-4" />Sentar</Button><Button variant="ghost" size="sm" onClick={() => setSesionDetalle(null)}>Cerrar</Button></div>}>
          {loadingDetalle ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin" /></div>
          : sesionDetalle.jugadores.length === 0 ? <p className="text-silver text-center py-6">No hay jugadores sentados.</p>
          : <div className="space-y-3">{sesionDetalle.jugadores.map((j) => (
            <div key={j.id} className={`flex items-center justify-between p-4 rounded-lg border ${j.hora_salida ? 'bg-graphite/30 border-graphite/50 opacity-60' : 'bg-slate border-graphite'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${j.hora_salida ? 'bg-graphite text-silver' : 'bg-gold/20 text-gold'}`}>{j.asiento || '?'}</div>
                <div><p className="font-medium text-pearl">{j.apodo || j.nombre}</p><p className="text-xs text-silver">Buy-in: {fmt(j.buy_in_total)}{j.cash_out !== null && <> | Cash-out: {fmt(j.cash_out)}</>}{j.resultado !== null && <span className={j.resultado >= 0 ? ' text-emerald' : ' text-ruby'}> ({j.resultado >= 0 ? '+' : ''}{fmt(j.resultado)})</span>}</p></div>
              </div>
              {!j.hora_salida && <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => openRecompraModal(sesionDetalle.id_sesion, j)}><Plus className="w-4 h-4" />Recompra</Button><Button size="sm" variant="danger" onClick={() => openCashoutModal(sesionDetalle.id_sesion, j)}><LogOut className="w-4 h-4" />Cash Out</Button></div>}
            </div>
          ))}</div>}
        </Card>
      )}
      <Card title="Configuración de Mesas" noPadding>
        {mesas.length === 0 ? <div className="p-8 text-center"><p className="text-silver mb-4">No hay mesas configuradas</p>{isGerente() && <Button onClick={() => { resetMesaForm(); setCrearMesaModal(true); }}><Plus className="w-4 h-4" />Crear Primera Mesa</Button>}</div>
        : <Table columns={[
            { key: 'num', header: '#', className: 'w-16', render: (m) => <span className="font-bold text-gold">{m.numero_mesa}</span> },
            { key: 'nombre', header: 'Nombre', render: (m) => m.nombre || <span className="text-silver">-</span> },
            { key: 'cap', header: 'Capacidad', render: (m) => `${m.capacidad} asientos` },
            { key: 'tipo', header: 'Tipo', render: (m) => <Badge variant="default">{m.tipo_juego || 'NLHE'}</Badge> },
            { key: 'estado', header: 'Estado', render: (m) => { const s = getMesaSesion(m.id_mesa); if (s) return <Badge variant="success">En Juego</Badge>; return m.activa ? <Badge variant="default">Disponible</Badge> : <Badge variant="error">Inactiva</Badge>; } },
            { key: 'acc', header: '', className: 'text-right', render: (m) => { const s = getMesaSesion(m.id_mesa); return (<div className="flex justify-end gap-2">{!s && m.activa && isGerente() && <Button size="sm" onClick={() => setIniciarSesionModal(m)}><Play className="w-4 h-4" />Iniciar</Button>}{isGerente() && <><Button variant="ghost" size="sm" onClick={() => openEditModal(m)}><Edit className="w-4 h-4" /></Button>{!s && <Button variant="ghost" size="sm" onClick={() => handleToggleActiva(m)}>{m.activa ? <Trash2 className="w-4 h-4 text-ruby" /> : <Play className="w-4 h-4 text-emerald" />}</Button>}</>}</div>); } },
          ]} data={mesas} keyExtractor={(m) => m.id_mesa} />}
      </Card>

      <Modal isOpen={crearMesaModal} onClose={() => setCrearMesaModal(false)} title="Nueva Mesa" footer={<><Button variant="ghost" onClick={() => setCrearMesaModal(false)}>Cancelar</Button><Button onClick={handleCrearMesa} isLoading={procesando}>Crear</Button></>}>
        <div className="space-y-4">
          <Input label="Número *" type="number" value={mesaForm.numero_mesa} onChange={(e) => setMesaForm({ ...mesaForm, numero_mesa: e.target.value })} />
          <Input label="Nombre" value={mesaForm.nombre} onChange={(e) => setMesaForm({ ...mesaForm, nombre: e.target.value })} />
          <Input label="Capacidad" type="number" value={mesaForm.capacidad} onChange={(e) => setMesaForm({ ...mesaForm, capacidad: e.target.value })} />
        </div>
      </Modal>
      <Modal isOpen={!!editarMesaModal} onClose={() => setEditarMesaModal(null)} title={`Editar Mesa ${editarMesaModal?.numero_mesa}`} footer={<><Button variant="ghost" onClick={() => setEditarMesaModal(null)}>Cancelar</Button><Button onClick={handleEditarMesa} isLoading={procesando}>Guardar</Button></>}>
        <div className="space-y-4"><Input label="Nombre" value={mesaForm.nombre} onChange={(e) => setMesaForm({ ...mesaForm, nombre: e.target.value })} /><Input label="Capacidad" type="number" value={mesaForm.capacidad} onChange={(e) => setMesaForm({ ...mesaForm, capacidad: e.target.value })} /></div>
      </Modal>
      <Modal isOpen={!!iniciarSesionModal} onClose={() => setIniciarSesionModal(null)} title={`Iniciar - Mesa ${iniciarSesionModal?.numero_mesa}`} footer={<><Button variant="ghost" onClick={() => setIniciarSesionModal(null)}>Cancelar</Button><Button onClick={handleIniciarSesion} isLoading={procesando}><Play className="w-4 h-4" />Iniciar</Button></>}>
        <div className="space-y-4"><Alert type="info">Se iniciará sesión de juego.</Alert><Input label="Stakes" value={stakes} onChange={(e) => setStakes(e.target.value)} placeholder="1/2, 2/5, 5/10" /></div>
      </Modal>

      {/* Sentar Jugador - Buy In con denominaciones */}
      <Modal isOpen={!!sentarModal} onClose={() => { setSentarModal(null); setJugadorSeleccionado(null); setJugadoresEncontrados([]); setBusquedaJugador(''); setAsiento(''); }} title="Buy In - Sentar Jugador" size="lg" footer={<><Button variant="ghost" onClick={() => setSentarModal(null)}>Cancelar</Button><Button onClick={handleSentarJugador} isLoading={procesando} disabled={!jugadorSeleccionado || calcTotalSeleccion() <= 0}><UserPlus className="w-4 h-4" />Sentar ({fmt(calcTotalSeleccion())})</Button></>}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-silver mb-2">Buscar Jugador</label><div className="flex gap-2"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-silver" /><input type="text" placeholder="Nombre o apodo..." value={busquedaJugador} onChange={(e) => setBusquedaJugador(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscarJugador()} className="w-full pl-10 pr-4 py-2.5 bg-slate border border-graphite rounded-lg text-pearl placeholder:text-silver/60 focus:outline-none focus:border-gold" /></div><Button onClick={buscarJugador}>Buscar</Button></div></div>
          {jugadoresEncontrados.length > 0 && !jugadorSeleccionado && <div className="space-y-2 max-h-36 overflow-y-auto">{jugadoresEncontrados.map((j) => (<button key={j.id_jugador} onClick={() => { setJugadorSeleccionado(j); setJugadoresEncontrados([]); }} className="w-full text-left p-3 rounded-lg border border-graphite hover:border-gold/50"><p className="font-medium text-pearl">{j.nombre_completo}</p>{j.apodo && <p className="text-sm text-silver">"{j.apodo}"</p>}</button>))}</div>}
          {jugadorSeleccionado && <div className="p-4 bg-gold/10 border border-gold/30 rounded-lg flex items-center justify-between"><div><p className="text-sm text-gold">Jugador:</p><p className="font-bold text-pearl">{jugadorSeleccionado.apodo || jugadorSeleccionado.nombre_completo}</p></div><button onClick={() => setJugadorSeleccionado(null)} className="text-silver hover:text-pearl text-xl">&times;</button></div>}
          <Input label="Asiento (opcional)" type="number" value={asiento} onChange={(e) => setAsiento(e.target.value)} placeholder="1-12" />
          <div><label className="block text-sm font-medium text-silver mb-2">Método de Pago</label><div className="grid grid-cols-3 gap-2">{['EFECTIVO', 'TARJETA', 'CREDITO'].map((m) => (<button key={m} onClick={() => setBuyInMetodo(m)} className={`p-3 rounded-lg border text-center text-sm ${buyInMetodo === m ? 'border-gold bg-gold/10 text-gold' : 'border-graphite text-silver hover:border-gold/50'}`}>{m}</button>))}</div></div>
          <h4 className="text-sm font-semibold text-pearl flex items-center gap-2"><Coins className="w-4 h-4 text-gold" />Fichas a entregar (desde caja)</h4>
          <DenominacionSelector modo="caja" />
        </div>
      </Modal>

      {/* Cashout con denominaciones */}
      <Modal isOpen={!!cashoutModal} onClose={() => setCashoutModal(null)} title={`Cash Out - ${cashoutModal?.jugadorSesion.apodo || cashoutModal?.jugadorSesion.nombre}`} size="lg" footer={<><Button variant="ghost" onClick={() => setCashoutModal(null)}>Cancelar</Button><Button variant="danger" onClick={handleCashout} isLoading={procesando} disabled={calcTotalSeleccion() <= 0}><LogOut className="w-4 h-4" />Cash Out ({fmt(calcTotalSeleccion())})</Button></>}>
        <div className="space-y-4">
          {cashoutModal && <div className="p-4 bg-slate rounded-lg"><div className="flex justify-between text-sm"><span className="text-silver">Buy-in total:</span><span className="text-pearl font-medium">{fmt(cashoutModal.jugadorSesion.buy_in_total)}</span></div></div>}
          <div><label className="block text-sm font-medium text-silver mb-2">Método de Cobro</label><div className="grid grid-cols-3 gap-2">{['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE'].map((m) => (<button key={m} onClick={() => setCashoutMetodo(m)} className={`p-3 rounded-lg border text-center text-sm ${cashoutMetodo === m ? 'border-gold bg-gold/10 text-gold' : 'border-graphite text-silver hover:border-gold/50'}`}>{m}</button>))}</div></div>
          <h4 className="text-sm font-semibold text-pearl flex items-center gap-2"><Coins className="w-4 h-4 text-amber" />Fichas que entrega el jugador (desde circulación)</h4>
          <DenominacionSelector modo="circulacion" />
        </div>
      </Modal>

      {/* Recompra con denominaciones */}
      <Modal isOpen={!!recompraModal} onClose={() => setRecompraModal(null)} title={`Recompra - ${recompraModal?.jugadorSesion.apodo || recompraModal?.jugadorSesion.nombre}`} size="lg" footer={<><Button variant="ghost" onClick={() => setRecompraModal(null)}>Cancelar</Button><Button onClick={handleRecompra} isLoading={procesando} disabled={calcTotalSeleccion() <= 0}><Plus className="w-4 h-4" />Recompra ({fmt(calcTotalSeleccion())})</Button></>}>
        <div className="space-y-4">
          {recompraModal && <div className="p-4 bg-slate rounded-lg"><div className="flex justify-between text-sm"><span className="text-silver">Buy-in actual:</span><span className="text-pearl font-medium">{fmt(recompraModal.jugadorSesion.buy_in_total)}</span></div></div>}
          <div><label className="block text-sm font-medium text-silver mb-2">Método de Pago</label><div className="grid grid-cols-3 gap-2">{['EFECTIVO', 'TARJETA', 'CREDITO'].map((m) => (<button key={m} onClick={() => setRecompraMetodo(m)} className={`p-3 rounded-lg border text-center text-sm ${recompraMetodo === m ? 'border-gold bg-gold/10 text-gold' : 'border-graphite text-silver hover:border-gold/50'}`}>{m}</button>))}</div></div>
          <h4 className="text-sm font-semibold text-pearl flex items-center gap-2"><Coins className="w-4 h-4 text-gold" />Fichas a entregar (desde caja)</h4>
          <DenominacionSelector modo="caja" />
        </div>
      </Modal>
    </div>
  );
}