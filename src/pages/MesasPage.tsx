import { useEffect, useState } from 'react';
import { Play, Square, Users, Clock, DollarSign, Plus, Edit, Trash2, RotateCcw, Power } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Table, Alert } from '../components/ui';
import { mesaService } from '../services/api';
import { useAuthStore } from '../store/authStore';

// ============================================================================
// TIPOS
// ============================================================================

interface Mesa {
  id_mesa: number;
  numero_mesa: number;
  nombre: string | null;
  capacidad: number;
  tipo_juego: string;
  stake_minimo: number | null;
  stake_maximo: number | null;
  activa: boolean;
}

interface SesionActiva {
  id_sesion: number;
  id_mesa: number;
  mesa_numero: number;
  mesa_nombre: string;
  stakes: string;
  hora_inicio: string;
  estado: string;
  jugadores_count: number;
  total_rake: number;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export default function MesasPage() {
  const { isGerente } = useAuthStore();

  // ── datos ──────────────────────────────────────────────────────────────────
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesasInactivas, setMesasInactivas] = useState<Mesa[]>([]);
  const [sesionesActivas, setSesionesActivas] = useState<SesionActiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── modales ────────────────────────────────────────────────────────────────
  const [crearMesaModal, setCrearMesaModal] = useState(false);
  const [editarMesaModal, setEditarMesaModal] = useState<Mesa | null>(null);
  const [iniciarSesionModal, setIniciarSesionModal] = useState<Mesa | null>(null);

  // ── modo crear: 'nueva' | 'existente' ──────────────────────────────────────
  const [modoCrear, setModoCrear] = useState<'nueva' | 'existente'>('nueva');
  const [mesaExistenteSel, setMesaExistenteSel] = useState<Mesa | null>(null);

  // ── form crear/editar ──────────────────────────────────────────────────────
  const [mesaForm, setMesaForm] = useState({
    numero_mesa: '',
    nombre: '',
    capacidad: '9',
    tipo_juego: 'NLHE',
  });

  // ── form sesión ────────────────────────────────────────────────────────────
  const [stakes, setStakes] = useState('1/2');
  const [procesando, setProcesando] = useState(false);

  // ============================================================================
  // FETCH
  // ============================================================================

  const fetchData = async () => {
    try {
      setError(null);
      const [mesasData, sesionesData, inactivasData] = await Promise.all([
        mesaService.getAll(),
        mesaService.getSesionesActivas(),
        mesaService.getInactivas(),
      ]);
      setMesas(mesasData || []);
      setSesionesActivas(sesionesData || []);
      setMesasInactivas(inactivasData || []);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const resetCrearModal = () => {
    setModoCrear('nueva');
    setMesaExistenteSel(null);
    setMesaForm({ numero_mesa: '', nombre: '', capacidad: '9', tipo_juego: 'NLHE' });
  };

  const getMesaSesion = (idMesa: number) => sesionesActivas.find((s) => s.id_mesa === idMesa);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);

  const formatTime = (time: string) =>
    new Date(time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  // ============================================================================
  // HANDLERS — MESAS
  // ============================================================================

  /** Crear nueva mesa o reactivar existente */
  const handleCrearMesa = async () => {
    setProcesando(true);
    try {
      if (modoCrear === 'existente') {
        // Reactivar mesa inactiva existente → PUT con activa: true
        if (!mesaExistenteSel) return;
        await mesaService.actualizar(mesaExistenteSel.id_mesa, { activa: true });
      } else {
        // Nueva mesa
        if (!mesaForm.numero_mesa) {
          alert('El número de mesa es requerido');
          return;
        }
        const data: any = {
          numero_mesa: Number(mesaForm.numero_mesa),
          capacidad: Number(mesaForm.capacidad) || 9,
          tipo_juego: mesaForm.tipo_juego || 'NLHE',
        };
        if (mesaForm.nombre.trim()) {
          data.nombre = mesaForm.nombre.trim();
        }
        await mesaService.crear(data);
      }

      setCrearMesaModal(false);
      resetCrearModal();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al crear mesa');
    } finally {
      setProcesando(false);
    }
  };

  /** Guardar edición (nombre / capacidad) */
  const handleEditarMesa = async () => {
    if (!editarMesaModal) return;
    setProcesando(true);
    try {
      await mesaService.actualizar(editarMesaModal.id_mesa, {
        nombre: mesaForm.nombre || null,
        capacidad: Number(mesaForm.capacidad),
      });
      setEditarMesaModal(null);
      resetCrearModal();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al actualizar mesa');
    } finally {
      setProcesando(false);
    }
  };

  /** Toggle activa / inactiva */
  const handleToggleActiva = async (mesa: Mesa) => {
    try {
      await mesaService.actualizar(mesa.id_mesa, { activa: !mesa.activa });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al cambiar estado');
    }
  };

  /** Eliminar mesa permanentemente */
  const handleEliminarMesa = async (mesa: Mesa) => {
    if (!confirm(`¿Eliminar la Mesa ${mesa.numero_mesa} permanentemente? Esta acción no se puede revertir.`)) return;
    try {
      await mesaService.eliminar(mesa.id_mesa);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'No se pudo eliminar la mesa');
    }
  };

  /** Abrir modal editar con datos prefilled */
  const openEditModal = (mesa: Mesa) => {
    setMesaForm({
      numero_mesa: String(mesa.numero_mesa),
      nombre: mesa.nombre || '',
      capacidad: String(mesa.capacidad),
      tipo_juego: mesa.tipo_juego || 'NLHE',
    });
    setEditarMesaModal(mesa);
  };

  // ============================================================================
  // HANDLERS — SESIONES
  // ============================================================================

  const handleIniciarSesion = async () => {
    if (!iniciarSesionModal) return;
    setProcesando(true);
    try {
      await mesaService.iniciarSesion(iniciarSesionModal.id_mesa, stakes);
      setIniciarSesionModal(null);
      setStakes('1/2');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setProcesando(false);
    }
  };

  const handleCerrarSesion = async (idSesion: number) => {
    if (!confirm('¿Cerrar esta sesión de mesa?')) return;
    try {
      await mesaService.cerrarSesion(idSesion);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al cerrar sesión');
    }
  };

  // ============================================================================
  // LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pearl">Mesas</h1>
          <p className="text-silver">Gestión de mesas y sesiones de juego</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{sesionesActivas.length} mesa{sesionesActivas.length !== 1 ? 's' : ''} en juego</Badge>
          {isGerente() && (
            <Button onClick={() => { resetCrearModal(); setCrearMesaModal(true); }}>
              <Plus className="w-4 h-4" />
              Nueva Mesa
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* ── Sesiones Activas ────────────────────────────────────────────────── */}
      {sesionesActivas.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-pearl">Mesas en Juego</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sesionesActivas.map((sesion) => (
              <Card key={sesion.id_sesion} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full -mr-12 -mt-12" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-pearl">Mesa {sesion.mesa_numero}</h3>
                      <p className="text-silver text-sm">{sesion.mesa_nombre || 'Sin nombre'}</p>
                    </div>
                    <Badge variant="success">
                      <span className="w-2 h-2 bg-emerald rounded-full mr-1.5 animate-pulse" />
                      {sesion.estado}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-pearl">
                      <Users className="w-4 h-4 text-silver" />
                      {sesion.jugadores_count} jugadores
                    </div>
                    <div className="flex items-center gap-2 text-pearl">
                      <Clock className="w-4 h-4 text-silver" />
                      {formatTime(sesion.hora_inicio)}
                    </div>
                    <div className="flex items-center gap-2 text-pearl">
                      <DollarSign className="w-4 h-4 text-silver" />
                      Stakes: {sesion.stakes}
                    </div>
                    <div className="flex items-center gap-2 text-gold font-medium">
                      <DollarSign className="w-4 h-4" />
                      Rake: {formatCurrency(sesion.total_rake)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1">
                      Ver Detalles
                    </Button>
                    {isGerente() && (
                      <Button variant="danger" size="sm" onClick={() => handleCerrarSesion(sesion.id_sesion)}>
                        <Square className="w-4 h-4" />
                        Cerrar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── Tabla de Mesas ──────────────────────────────────────────────────── */}
      <Card title="Configuración de Mesas" noPadding>
        {mesas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-silver mb-4">No hay mesas configuradas</p>
            {isGerente() && (
              <Button onClick={() => { resetCrearModal(); setCrearMesaModal(true); }}>
                <Plus className="w-4 h-4" />
                Crear Primera Mesa
              </Button>
            )}
          </div>
        ) : (
          <Table
            columns={[
              {
                key: 'numero_mesa',
                header: '#',
                className: 'w-16',
                render: (m) => <span className="font-bold text-gold">{m.numero_mesa}</span>,
              },
              {
                key: 'nombre',
                header: 'Nombre',
                render: (m) => m.nombre || <span className="text-silver">-</span>,
              },
              {
                key: 'capacidad',
                header: 'Capacidad',
                render: (m) => `${m.capacidad} asientos`,
              },
              {
                key: 'tipo',
                header: 'Tipo',
                render: (m) => <Badge variant="default">{m.tipo_juego || 'NLHE'}</Badge>,
              },
              {
                key: 'estado',
                header: 'Estado',
                render: (m) => {
                  const sesion = getMesaSesion(m.id_mesa);
                  if (sesion) return <Badge variant="success">En Juego</Badge>;
                  return m.activa
                    ? <Badge variant="default">Disponible</Badge>
                    : <Badge variant="error">Inactiva</Badge>;
                },
              },
              {
                key: 'acciones',
                header: '',
                className: 'text-right',
                render: (m) => {
                  const sesion = getMesaSesion(m.id_mesa);
                  return (
                    <div className="flex justify-end items-center gap-2">
                      {/* Botón Iniciar sesión — solo mesas activas sin sesión */}
                      {!sesion && m.activa && isGerente() && (
                        <Button size="sm" onClick={() => setIniciarSesionModal(m)}>
                          <Play className="w-4 h-4" />
                          Iniciar
                        </Button>
                      )}

                      {isGerente() && (
                        <>
                          {/* Toggle activa / inactiva — no si tiene sesión activa */}
                          {!sesion && (
                            <button
                              onClick={() => handleToggleActiva(m)}
                              title={m.activa ? 'Desactivar mesa' : 'Activar mesa'}
                              className={`
                                relative w-10 h-5 rounded-full transition-colors duration-200
                                focus:outline-none focus:ring-2 focus:ring-gold/50
                                ${m.activa ? 'bg-emerald' : 'bg-graphite'}
                              `}
                            >
                              <span
                                className={`
                                  absolute top-0.5 left-0.5 w-4 h-4 bg-pearl rounded-full shadow
                                  transition-transform duration-200
                                  ${m.activa ? 'translate-x-5' : 'translate-x-0'}
                                `}
                              />
                            </button>
                          )}

                          {/* Editar */}
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(m)}>
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Eliminar — solo si no tiene sesión activa */}
                          {!sesion && (
                            <Button variant="ghost" size="sm" onClick={() => handleEliminarMesa(m)}>
                              <Trash2 className="w-4 h-4 text-ruby" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={mesas}
            keyExtractor={(m) => m.id_mesa}
          />
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALES
          ═════════════════════════════════════════════════════════════════════ */}

      {/* ── Modal Crear / Reactivar Mesa ─────────────────────────────────── */}
      <Modal
        isOpen={crearMesaModal}
        onClose={() => { setCrearMesaModal(false); resetCrearModal(); }}
        title="Nueva Mesa"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCrearMesaModal(false); resetCrearModal(); }}>
              Cancelar
            </Button>
            <Button onClick={handleCrearMesa} isLoading={procesando}>
              {modoCrear === 'existente' ? <><RotateCcw className="w-4 h-4" /> Reactivar</> : 'Crear Mesa'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Selector modo — solo si hay mesas inactivas */}
          {mesasInactivas.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => { setModoCrear('nueva'); setMesaExistenteSel(null); }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${modoCrear === 'nueva'
                    ? 'bg-gold/20 border border-gold text-gold'
                    : 'bg-slate border border-graphite text-silver hover:border-gold/50'
                  }`}
              >
                Nueva mesa
              </button>
              <button
                onClick={() => setModoCrear('existente')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${modoCrear === 'existente'
                    ? 'bg-gold/20 border border-gold text-gold'
                    : 'bg-slate border border-graphite text-silver hover:border-gold/50'
                  }`}
              >
                Reactivar existente
              </button>
            </div>
          )}

          {/* ── Modo: reactivar existente ─── */}
          {modoCrear === 'existente' && (
            <div>
              <label className="block text-sm font-medium text-silver mb-2">
                Selecciona una mesa inactiva
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {mesasInactivas.map((m) => (
                  <button
                    key={m.id_mesa}
                    onClick={() => setMesaExistenteSel(m)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors
                      ${mesaExistenteSel?.id_mesa === m.id_mesa
                        ? 'bg-gold/10 border-gold text-pearl'
                        : 'bg-slate border-graphite text-silver hover:border-gold/50'
                      }`}
                  >
                    <span className="font-semibold text-gold mr-2">#{m.numero_mesa}</span>
                    <span>{m.nombre || 'Sin nombre'}</span>
                    <span className="text-xs ml-2 opacity-60">{m.capacidad} asientos · {m.tipo_juego}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Modo: nueva mesa ─── */}
          {modoCrear === 'nueva' && (
            <>
              <Input
                label="Número de Mesa *"
                type="number"
                value={mesaForm.numero_mesa}
                onChange={(e) => setMesaForm({ ...mesaForm, numero_mesa: e.target.value })}
                placeholder="Ej: 1, 2, 3…"
              />
              <Input
                label="Nombre (opcional)"
                value={mesaForm.nombre}
                onChange={(e) => setMesaForm({ ...mesaForm, nombre: e.target.value })}
                placeholder="Ej: Mesa Principal, VIP…"
              />
              <Input
                label="Capacidad"
                type="number"
                value={mesaForm.capacidad}
                onChange={(e) => setMesaForm({ ...mesaForm, capacidad: e.target.value })}
                placeholder="Número de asientos"
              />
              <div>
                <label className="block text-sm font-medium text-silver mb-2">Tipo de Juego</label>
                <select
                  value={mesaForm.tipo_juego}
                  onChange={(e) => setMesaForm({ ...mesaForm, tipo_juego: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate border border-graphite rounded-lg text-pearl focus:outline-none focus:border-gold"
                >
                  <option value="NLHE">No-Limit Hold'em</option>
                  <option value="PLO">Pot-Limit Omaha</option>
                  <option value="MIXTO">Mixto</option>
                </select>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Modal Editar Mesa ───────────────────────────────────────────── */}
      <Modal
        isOpen={!!editarMesaModal}
        onClose={() => setEditarMesaModal(null)}
        title={`Editar Mesa ${editarMesaModal?.numero_mesa}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditarMesaModal(null)}>Cancelar</Button>
            <Button onClick={handleEditarMesa} isLoading={procesando}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre (opcional)"
            value={mesaForm.nombre}
            onChange={(e) => setMesaForm({ ...mesaForm, nombre: e.target.value })}
            placeholder="Ej: Mesa Principal, VIP…"
          />
          <Input
            label="Capacidad"
            type="number"
            value={mesaForm.capacidad}
            onChange={(e) => setMesaForm({ ...mesaForm, capacidad: e.target.value })}
            placeholder="Número de asientos"
          />
        </div>
      </Modal>

      {/* ── Modal Iniciar Sesión ────────────────────────────────────────── */}
      <Modal
        isOpen={!!iniciarSesionModal}
        onClose={() => setIniciarSesionModal(null)}
        title={`Iniciar Sesión - Mesa ${iniciarSesionModal?.numero_mesa}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIniciarSesionModal(null)}>Cancelar</Button>
            <Button onClick={handleIniciarSesion} isLoading={procesando}>
              <Play className="w-4 h-4" />
              Iniciar Sesión
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert type="info">
            Se iniciará una sesión de juego en esta mesa. Asegúrate de que haya un turno activo.
          </Alert>
          <Input
            label="Stakes"
            value={stakes}
            onChange={(e) => setStakes(e.target.value)}
            placeholder="Ej: 1/2, 2/5, 5/10"
          />
          <p className="text-sm text-silver">Una vez iniciada, podrás sentar jugadores y registrar rake.</p>
        </div>
      </Modal>
    </div>
  );
}
