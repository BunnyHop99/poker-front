import { useEffect, useState } from 'react';
import { Clock, Play, Square, DollarSign, Users, TrendingUp, CheckCircle, Briefcase, Coins, Plus, Minus } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Alert, StatCard } from '../components/ui';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Turno {
  id_turno: number;
  fecha: string;
  hora_inicio: string;
  hora_cierre: string | null;
  estado: string;
  saldo_inicial_caja: number;
  notas: string | null;
  gerente?: { id: number; nombre: string; apodo: string };
}

interface TurnoActivo {
  hay_turno_activo: boolean;
  turno?: Turno & {
    total_ventas: number;
    total_cobros: number;
    total_rake: number;
    total_propinas: number;
    total_gastos: number;
    mesas_activas: number;
  };
}

interface PersonalItem {
  id: number;
  nombre: string;
  apodo: string | null;
}

interface FichaItem {
  id_ficha: number;
  denominacion: number;
  color: string | null;
  cantidad_boveda: number;
  cantidad_caja: number;
  cantidad_circulacion: number;
  cantidad_total: number;
  valor_boveda: number;
  valor_caja: number;
}

interface PreviewApertura {
  puede_abrir: boolean;
  hay_turno_activo: boolean;
  fichas: {
    valor_boveda: number;
    valor_caja: number;
    valor_total: number;
    detalle: FichaItem[];
  };
  personal: {
    dealers: PersonalItem[];
    cajeros: PersonalItem[];
    gerentes: PersonalItem[];
  };
}

interface FichaTransferencia {
  id_ficha: number;
  cantidad: number;
}

export default function TurnoPage() {
  const { isGerente } = useAuthStore();
  const [turnoActivo, setTurnoActivo] = useState<TurnoActivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal de apertura
  const [abrirModal, setAbrirModal] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewApertura | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Form de apertura
  const [selectedDealers, setSelectedDealers] = useState<number[]>([]);
  const [selectedCajeros, setSelectedCajeros] = useState<number[]>([]);
  const [fichasACaja, setFichasACaja] = useState<Record<number, number>>({});
  const [notas, setNotas] = useState('');
  const [procesando, setProcesando] = useState(false);
  
  // Modal cerrar
  const [cerrarModal, setCerrarModal] = useState(false);

  const fetchTurno = async () => {
    try {
      setError(null);
      const response = await api.get('/turnos/activo');
      setTurnoActivo(response.data);
    } catch (err: any) {
      console.error('Error:', err);
      setTurnoActivo({ hay_turno_activo: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurno();
    const interval = setInterval(fetchTurno, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPreviewApertura = async () => {
    setLoadingPreview(true);
    try {
      const response = await api.get('/turnos/preview-apertura');
      setPreviewData(response.data);
      // Inicializar fichas a caja en 0
      const initialFichas: Record<number, number> = {};
      response.data.fichas.detalle.forEach((f: FichaItem) => {
        initialFichas[f.id_ficha] = 0;
      });
      setFichasACaja(initialFichas);
      setAbrirModal(true);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al cargar datos de apertura');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleAbrirTurno = async () => {
    setProcesando(true);
    try {
      // Construir array de fichas a transferir
      const fichasArray: FichaTransferencia[] = Object.entries(fichasACaja)
        .filter(([_, cantidad]) => cantidad > 0)
        .map(([id, cantidad]) => ({
          id_ficha: Number(id),
          cantidad: cantidad
        }));

      await api.post('/turnos/abrir', {
        notas: notas || null,
        dealers_ids: selectedDealers,
        cajeros_ids: selectedCajeros,
        fichas_a_caja: fichasArray
      });
      setAbrirModal(false);
      setNotas('');
      setSelectedDealers([]);
      setSelectedCajeros([]);
      setFichasACaja({});
      await fetchTurno();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al abrir turno');
    } finally {
      setProcesando(false);
    }
  };

  const handleCerrarTurno = async () => {
    if (!turnoActivo?.turno) return;
    setProcesando(true);
    try {
      await api.post(`/turnos/${turnoActivo.turno.id_turno}/cerrar`);
      setCerrarModal(false);
      await fetchTurno();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al cerrar turno');
    } finally {
      setProcesando(false);
    }
  };

  const toggleDealer = (id: number) => {
    setSelectedDealers(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleCajero = (id: number) => {
    setSelectedCajeros(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const updateFichaCantidad = (idFicha: number, delta: number, maxBoveda: number) => {
    setFichasACaja(prev => {
      const current = prev[idFicha] || 0;
      const newValue = Math.max(0, Math.min(maxBoveda, current + delta));
      return { ...prev, [idFicha]: newValue };
    });
  };

  const setFichaCantidad = (idFicha: number, value: number, maxBoveda: number) => {
    const cantidad = Math.max(0, Math.min(maxBoveda, value || 0));
    setFichasACaja(prev => ({ ...prev, [idFicha]: cantidad }));
  };

  // Calcular total a transferir
  const calcularTotalTransferencia = () => {
    if (!previewData) return 0;
    return previewData.fichas.detalle.reduce((total, ficha) => {
      const cantidad = fichasACaja[ficha.id_ficha] || 0;
      return total + (ficha.denominacion * cantidad);
    }, 0);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
  const formatTime = (t: string) => t ? new Date(`2000-01-01T${t}`).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const turno = turnoActivo?.turno;
  const hayTurno = turnoActivo?.hay_turno_activo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pearl">Gestión de Turno</h1>
          <p className="text-silver">Control de apertura y cierre de operaciones</p>
        </div>
        {isGerente() && (
          hayTurno ? (
            <Button variant="danger" onClick={() => setCerrarModal(true)}>
              <Square className="w-4 h-4" />
              Cerrar Turno
            </Button>
          ) : (
            <Button onClick={fetchPreviewApertura} isLoading={loadingPreview}>
              <Play className="w-4 h-4" />
              Abrir Turno
            </Button>
          )
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Sin turno activo */}
      {!hayTurno ? (
        <Card className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/10 flex items-center justify-center">
            <Clock className="w-10 h-10 text-gold" />
          </div>
          <h2 className="text-xl font-bold text-pearl mb-2">No hay turno activo</h2>
          <p className="text-silver">
            {isGerente() 
              ? 'Usa el botón "Abrir Turno" arriba para comenzar las operaciones del día.'
              : 'Contacta al gerente para abrir el turno.'}
          </p>
        </Card>
      ) : turno && (
        <>
          {/* Info del turno activo */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                  <Clock className="w-7 h-7 text-midnight" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-pearl">Turno #{turno.id_turno}</h2>
                  <p className="text-silver">{formatDate(turno.fecha)}</p>
                </div>
              </div>
              <Badge variant="success" className="text-lg px-4 py-2">
                <span className="w-3 h-3 bg-emerald rounded-full mr-2 animate-pulse" />
                EN OPERACIÓN
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-slate rounded-lg">
                <p className="text-sm text-silver mb-1">Inicio</p>
                <p className="text-2xl font-bold text-pearl">{formatTime(turno.hora_inicio)}</p>
              </div>
              <div className="text-center p-4 bg-slate rounded-lg">
                <p className="text-sm text-silver mb-1">Gerente</p>
                <p className="text-lg font-medium text-pearl">{turno.gerente?.apodo || turno.gerente?.nombre || 'N/A'}</p>
              </div>
              <div className="text-center p-4 bg-slate rounded-lg">
                <p className="text-sm text-silver mb-1">Caja Inicial</p>
                <p className="text-xl font-bold text-gold">{formatCurrency(turno.saldo_inicial_caja)}</p>
              </div>
              <div className="text-center p-4 bg-slate rounded-lg">
                <p className="text-sm text-silver mb-1">Mesas Activas</p>
                <p className="text-2xl font-bold text-pearl">{turno.mesas_activas || 0}</p>
              </div>
            </div>
          </Card>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Ventas" value={formatCurrency(turno.total_ventas)} icon={<DollarSign className="w-5 h-5" />} color="emerald" />
            <StatCard label="Cobros" value={formatCurrency(turno.total_cobros)} icon={<DollarSign className="w-5 h-5" />} color="sapphire" />
            <StatCard label="Rake" value={formatCurrency(turno.total_rake)} icon={<TrendingUp className="w-5 h-5" />} color="gold" />
            <StatCard label="Propinas" value={formatCurrency(turno.total_propinas)} icon={<Users className="w-5 h-5" />} color="amber" />
            <StatCard label="Gastos" value={formatCurrency(turno.total_gastos)} icon={<DollarSign className="w-5 h-5" />} color="ruby" />
          </div>

          {/* Resumen financiero */}
          <Card title="Resumen Financiero del Turno">
            <div className="space-y-3">
              <div className="flex justify-between py-3 border-b border-graphite">
                <span className="text-silver">Rake Recolectado</span>
                <span className="text-gold font-medium">{formatCurrency(turno.total_rake)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-graphite">
                <span className="text-silver">Comisión Propinas (10%)</span>
                <span className="text-amber font-medium">{formatCurrency((turno.total_propinas || 0) * 0.1)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-graphite">
                <span className="text-silver">Gastos Operativos</span>
                <span className="text-ruby font-medium">-{formatCurrency(turno.total_gastos)}</span>
              </div>
              <div className="flex justify-between py-4 text-lg bg-slate/50 rounded-lg px-4 -mx-4">
                <span className="text-pearl font-bold">Ganancia Estimada</span>
                <span className="text-gold font-bold">
                  {formatCurrency((turno.total_rake || 0) + (turno.total_propinas || 0) * 0.1 - (turno.total_gastos || 0))}
                </span>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Modal Abrir Turno */}
      <Modal
        isOpen={abrirModal}
        onClose={() => setAbrirModal(false)}
        title="Abrir Nuevo Turno"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAbrirModal(false)}>Cancelar</Button>
            <Button onClick={handleAbrirTurno} isLoading={procesando} disabled={!previewData?.puede_abrir}>
              <Play className="w-4 h-4" />
              Iniciar Turno
            </Button>
          </>
        }
      >
        {previewData && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {!previewData.puede_abrir && (
              <Alert type="error" title="No se puede abrir turno">
                Ya existe un turno activo. Ciérralo primero.
              </Alert>
            )}

            {/* Fichas - Transferencia de Bóveda a Caja */}
            <div>
              <h3 className="text-lg font-semibold text-pearl mb-3 flex items-center gap-2">
                <Coins className="w-5 h-5 text-gold" />
                Fichas para Caja (desde Bóveda)
              </h3>
              
              <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                <div className="p-3 bg-slate rounded-lg text-center">
                  <p className="text-silver">En Bóveda</p>
                  <p className="text-lg font-bold text-gold">{formatCurrency(previewData.fichas.valor_boveda)}</p>
                </div>
                <div className="p-3 bg-slate rounded-lg text-center">
                  <p className="text-silver">En Caja Actual</p>
                  <p className="text-lg font-bold text-emerald">{formatCurrency(previewData.fichas.valor_caja)}</p>
                </div>
                <div className="p-3 bg-slate rounded-lg text-center">
                  <p className="text-silver">A Transferir</p>
                  <p className="text-lg font-bold text-sapphire">{formatCurrency(calcularTotalTransferencia())}</p>
                </div>
              </div>

              {previewData.fichas.detalle.length === 0 ? (
                <Alert type="warning">No hay fichas registradas en el sistema. Registra fichas primero.</Alert>
              ) : (
                <div className="space-y-2">
                  {previewData.fichas.detalle.map((ficha) => (
                    <div 
                      key={ficha.id_ficha} 
                      className="flex items-center justify-between p-3 bg-slate rounded-lg border border-graphite"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ 
                            backgroundColor: ficha.color || '#D4AF37',
                            color: ficha.denominacion >= 100 ? '#000' : '#fff'
                          }}
                        >
                          ${ficha.denominacion >= 1000 ? `${ficha.denominacion/1000}K` : ficha.denominacion}
                        </div>
                        <div>
                          <p className="font-medium text-pearl">{formatCurrency(ficha.denominacion)}</p>
                          <p className="text-xs text-silver">
                            Bóveda: {ficha.cantidad_boveda} | Caja: {ficha.cantidad_caja}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateFichaCantidad(ficha.id_ficha, -10, ficha.cantidad_boveda)}
                          className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver"
                          disabled={!fichasACaja[ficha.id_ficha]}
                        >
                          -10
                        </button>
                        <button
                          onClick={() => updateFichaCantidad(ficha.id_ficha, -1, ficha.cantidad_boveda)}
                          className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver"
                          disabled={!fichasACaja[ficha.id_ficha]}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={ficha.cantidad_boveda}
                          value={fichasACaja[ficha.id_ficha] || 0}
                          onChange={(e) => setFichaCantidad(ficha.id_ficha, parseInt(e.target.value), ficha.cantidad_boveda)}
                          className="w-16 h-8 text-center bg-midnight border border-graphite rounded text-pearl"
                        />
                        <button
                          onClick={() => updateFichaCantidad(ficha.id_ficha, 1, ficha.cantidad_boveda)}
                          className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver"
                          disabled={(fichasACaja[ficha.id_ficha] || 0) >= ficha.cantidad_boveda}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateFichaCantidad(ficha.id_ficha, 10, ficha.cantidad_boveda)}
                          className="w-8 h-8 rounded bg-graphite hover:bg-silver/20 flex items-center justify-center text-silver"
                          disabled={(fichasACaja[ficha.id_ficha] || 0) >= ficha.cantidad_boveda}
                        >
                          +10
                        </button>
                        <button
                          onClick={() => setFichaCantidad(ficha.id_ficha, ficha.cantidad_boveda, ficha.cantidad_boveda)}
                          className="px-2 h-8 rounded bg-gold/20 hover:bg-gold/30 text-gold text-xs"
                        >
                          Todo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dealers */}
            <div>
              <h3 className="text-lg font-semibold text-pearl mb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald" />
                Dealers del Turno
                {selectedDealers.length > 0 && (
                  <Badge variant="success">{selectedDealers.length}</Badge>
                )}
              </h3>
              {previewData.personal.dealers.length === 0 ? (
                <p className="text-silver text-sm">No hay dealers activos</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {previewData.personal.dealers.map((dealer) => (
                    <button
                      key={dealer.id}
                      onClick={() => toggleDealer(dealer.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedDealers.includes(dealer.id)
                          ? 'border-emerald bg-emerald/10 text-pearl'
                          : 'border-graphite bg-slate text-silver hover:border-silver'
                      }`}
                    >
                      <p className="font-medium">{dealer.apodo || dealer.nombre}</p>
                      {selectedDealers.includes(dealer.id) && (
                        <CheckCircle className="w-4 h-4 text-emerald mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cajeros */}
            <div>
              <h3 className="text-lg font-semibold text-pearl mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-sapphire" />
                Cajeros del Turno
                {selectedCajeros.length > 0 && (
                  <Badge variant="info">{selectedCajeros.length}</Badge>
                )}
              </h3>
              {previewData.personal.cajeros.length === 0 ? (
                <p className="text-silver text-sm">No hay cajeros activos</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {previewData.personal.cajeros.map((cajero) => (
                    <button
                      key={cajero.id}
                      onClick={() => toggleCajero(cajero.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedCajeros.includes(cajero.id)
                          ? 'border-sapphire bg-sapphire/10 text-pearl'
                          : 'border-graphite bg-slate text-silver hover:border-silver'
                      }`}
                    >
                      <p className="font-medium">{cajero.apodo || cajero.nombre}</p>
                      {selectedCajeros.includes(cajero.id) && (
                        <CheckCircle className="w-4 h-4 text-sapphire mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notas */}
            <Input
              label="Notas del Turno (opcional)"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones, eventos especiales..."
            />

            {/* Resumen */}
            <div className="p-4 bg-gold/10 rounded-lg border border-gold/30">
              <h4 className="font-semibold text-gold mb-2">Resumen de Apertura</h4>
              <ul className="text-sm text-pearl space-y-1">
                <li>• Caja Actual: {formatCurrency(previewData.fichas.valor_caja)}</li>
                <li>• A Transferir: {formatCurrency(calcularTotalTransferencia())}</li>
                <li>• <strong>Caja Inicial: {formatCurrency(previewData.fichas.valor_caja + calcularTotalTransferencia())}</strong></li>
                <li>• Dealers: {selectedDealers.length || 'Ninguno'}</li>
                <li>• Cajeros: {selectedCajeros.length || 'Ninguno'}</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Cerrar Turno */}
      <Modal
        isOpen={cerrarModal}
        onClose={() => setCerrarModal(false)}
        title="Cerrar Turno"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCerrarModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleCerrarTurno} isLoading={procesando}>
              <Square className="w-4 h-4" />
              Confirmar Cierre
            </Button>
          </>
        }
      >
        <Alert type="warning" title="¿Estás seguro?">
          Al cerrar el turno no se podrán realizar más operaciones hasta abrir uno nuevo.
        </Alert>
        {turno && (
          <div className="mt-4 p-4 bg-slate rounded-lg">
            <h4 className="font-medium text-pearl mb-2">Resumen:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-silver">Rake:</div>
              <div className="text-gold font-medium">{formatCurrency(turno.total_rake)}</div>
              <div className="text-silver">Propinas:</div>
              <div className="text-pearl">{formatCurrency(turno.total_propinas)}</div>
              <div className="text-silver">Gastos:</div>
              <div className="text-ruby">{formatCurrency(turno.total_gastos)}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
