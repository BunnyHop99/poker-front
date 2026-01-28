import { useEffect, useState } from 'react';
import { Play, Square, Users, Clock, DollarSign, Plus, Edit, Trash2 } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Table, Alert } from '../components/ui';
import { mesaService } from '../services/api';
import { useAuthStore } from '../store/authStore';

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

export default function MesasPage() {
  const { isGerente } = useAuthStore();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [sesionesActivas, setSesionesActivas] = useState<SesionActiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modales
  const [crearMesaModal, setCrearMesaModal] = useState(false);
  const [editarMesaModal, setEditarMesaModal] = useState<Mesa | null>(null);
  const [iniciarSesionModal, setIniciarSesionModal] = useState<Mesa | null>(null);
  
  // Form crear/editar mesa
  const [mesaForm, setMesaForm] = useState({
    numero_mesa: '',
    nombre: '',
    capacidad: '9',
    tipo_juego: 'NLHE',
  });
  
  // Form iniciar sesion
  const [stakes, setStakes] = useState('1/2');
  const [procesando, setProcesando] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [mesasData, sesionesData] = await Promise.all([
        mesaService.getAll(),
        mesaService.getSesionesActivas(),
      ]);
      setMesas(mesasData || []);
      setSesionesActivas(sesionesData || []);
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

  const resetMesaForm = () => {
    setMesaForm({ numero_mesa: '', nombre: '', capacidad: '9', tipo_juego: 'NLHE' });
  };

  const handleCrearMesa = async () => {
    if (!mesaForm.numero_mesa) {
      alert('El número de mesa es requerido');
      return;
    }
    setProcesando(true);
    try {
      const data: any = {
        numero_mesa: Number(mesaForm.numero_mesa),
        capacidad: Number(mesaForm.capacidad) || 9,
        tipo_juego: mesaForm.tipo_juego || 'NLHE',
      };
      if (mesaForm.nombre && mesaForm.nombre.trim()) {
        data.nombre = mesaForm.nombre.trim();
      }
      await mesaService.crear(data);
      setCrearMesaModal(false);
      resetMesaForm();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al crear mesa');
    } finally {
      setProcesando(false);
    }
  };

  const handleEditarMesa = async () => {
    if (!editarMesaModal) return;
    setProcesando(true);
    try {
      await mesaService.actualizar(editarMesaModal.id_mesa, {
        nombre: mesaForm.nombre || null,
        capacidad: Number(mesaForm.capacidad),
        activa: editarMesaModal.activa,
      });
      setEditarMesaModal(null);
      resetMesaForm();
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al actualizar mesa');
    } finally {
      setProcesando(false);
    }
  };

  const handleToggleActiva = async (mesa: Mesa) => {
    try {
      await mesaService.actualizar(mesa.id_mesa, { activa: !mesa.activa });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al cambiar estado');
    }
  };

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

  const openEditModal = (mesa: Mesa) => {
    setMesaForm({
      numero_mesa: String(mesa.numero_mesa),
      nombre: mesa.nombre || '',
      capacidad: String(mesa.capacidad),
      tipo_juego: mesa.tipo_juego || 'NLHE',
    });
    setEditarMesaModal(mesa);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);

  const formatTime = (time: string) =>
    new Date(time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const getMesaSesion = (idMesa: number) => sesionesActivas.find((s) => s.id_mesa === idMesa);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pearl">Mesas</h1>
          <p className="text-silver">Gestión de mesas y sesiones de juego</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{sesionesActivas.length} mesas activas</Badge>
          {isGerente() && (
            <Button onClick={() => { resetMesaForm(); setCrearMesaModal(true); }}>
              <Plus className="w-4 h-4" />
              Nueva Mesa
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Sesiones Activas */}
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

      {/* Todas las Mesas */}
      <Card title="Configuración de Mesas" noPadding>
        {mesas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-silver mb-4">No hay mesas configuradas</p>
            {isGerente() && (
              <Button onClick={() => { resetMesaForm(); setCrearMesaModal(true); }}>
                <Plus className="w-4 h-4" />
                Crear Primera Mesa
              </Button>
            )}
          </div>
        ) : (
          <Table
            columns={[
              { key: 'numero_mesa', header: '#', className: 'w-16', render: (m) => <span className="font-bold text-gold">{m.numero_mesa}</span> },
              { key: 'nombre', header: 'Nombre', render: (m) => m.nombre || <span className="text-silver">-</span> },
              { key: 'capacidad', header: 'Capacidad', render: (m) => `${m.capacidad} asientos` },
              { key: 'tipo', header: 'Tipo', render: (m) => <Badge variant="default">{m.tipo_juego || 'NLHE'}</Badge> },
              {
                key: 'estado',
                header: 'Estado',
                render: (m) => {
                  const sesion = getMesaSesion(m.id_mesa);
                  if (sesion) return <Badge variant="success">En Juego</Badge>;
                  return m.activa ? <Badge variant="default">Disponible</Badge> : <Badge variant="error">Inactiva</Badge>;
                },
              },
              {
                key: 'acciones',
                header: '',
                className: 'text-right',
                render: (m) => {
                  const sesion = getMesaSesion(m.id_mesa);
                  return (
                    <div className="flex justify-end gap-2">
                      {!sesion && m.activa && isGerente() && (
                        <Button size="sm" onClick={() => setIniciarSesionModal(m)}>
                          <Play className="w-4 h-4" />
                          Iniciar
                        </Button>
                      )}
                      {isGerente() && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(m)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!sesion && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActiva(m)}
                            >
                              {m.activa ? (
                                <Trash2 className="w-4 h-4 text-ruby" />
                              ) : (
                                <Play className="w-4 h-4 text-emerald" />
                              )}
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

      {/* Modal Crear Mesa */}
      <Modal
        isOpen={crearMesaModal}
        onClose={() => setCrearMesaModal(false)}
        title="Nueva Mesa"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCrearMesaModal(false)}>Cancelar</Button>
            <Button onClick={handleCrearMesa} isLoading={procesando}>Crear Mesa</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Número de Mesa *"
            type="number"
            value={mesaForm.numero_mesa}
            onChange={(e) => setMesaForm({ ...mesaForm, numero_mesa: e.target.value })}
            placeholder="Ej: 1, 2, 3..."
          />
          <Input
            label="Nombre (opcional)"
            value={mesaForm.nombre}
            onChange={(e) => setMesaForm({ ...mesaForm, nombre: e.target.value })}
            placeholder="Ej: Mesa Principal, VIP..."
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
        </div>
      </Modal>

      {/* Modal Editar Mesa */}
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
            placeholder="Ej: Mesa Principal, VIP..."
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

      {/* Modal Iniciar Sesión */}
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
