import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  Play,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  History,
  Zap,
  X,
} from 'lucide-react';
import { Button, Card, StatCard, Badge, Alert } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { turnoService } from '../services/api';

// ============================================================================
// TYPES
// ============================================================================

interface TurnoActivo {
  hay_turno_activo: boolean;
  turno?: {
    id_turno: number;
    fecha: string;
    hora_inicio: string;
    hora_cierre?: string;
    estado: string;
    saldo_inicial_caja?: number;
    total_ventas?: number;
    total_cobros?: number;
    total_rake?: number;
    total_propinas?: number;
    total_gastos?: number;
    mesas_activas?: number;
  };
}

interface TurnoHistorial {
  id_turno: number;
  fecha: string;
  hora_inicio: string | null;
  hora_cierre: string | null;
  estado: string;
  gerente: string;
  total_ventas: number;
  total_cobros: number;
  total_rake: number;
  total_mesas: number;
  ganancia: number;
}

interface HistorialResponse {
  turnos: TurnoHistorial[];
  total: number;
  limit: number;
  offset: number;
}

type TabType = 'activo' | 'historial';

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);

const formatTime = (time: string | null) => {
  if (!time) return '--:--';
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return time;
  }
};

const formatDate = (fecha: string) => {
  try {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return fecha;
  }
};

const estadoBadge = (estado: string) => {
  switch (estado?.toUpperCase()) {
    case 'ACTIVO':
      return <Badge variant="success">Activo</Badge>;
    case 'CERRADO':
      return <Badge variant="default">Cerrado</Badge>;
    case 'PAUSADO':
      return <Badge variant="warning">Pausado</Badge>;
    default:
      return <Badge variant="default">{estado}</Badge>;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isGerente } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('activo');

  // Active turno state
  const [turnoActivo, setTurnoActivo] = useState<TurnoActivo | null>(null);
  const [loadingActivo, setLoadingActivo] = useState(true);

  // Historial state
  const [historial, setHistorial] = useState<TurnoHistorial[]>([]);
  const [historialTotal, setHistorialTotal] = useState(0);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialPage, setHistorialPage] = useState(0);
  const [historialLimit] = useState(10);

  // Filters
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [filterTurnoId, setFilterTurnoId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ---- Fetch active turno ----
  const fetchTurno = useCallback(async () => {
    try {
      const data = await turnoService.getTurnoActivo();
      setTurnoActivo(data);
    } catch (error) {
      console.error('Error fetching turno:', error);
    } finally {
      setLoadingActivo(false);
    }
  }, []);

  useEffect(() => {
    fetchTurno();
    const interval = setInterval(fetchTurno, 30000);
    return () => clearInterval(interval);
  }, [fetchTurno]);

  // ---- Fetch historial ----
  const fetchHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const params: Record<string, string | number> = {
        limit: historialLimit,
        offset: historialPage * historialLimit,
      };

      const data: HistorialResponse = await turnoService.getHistorial(params);
      setHistorial(data.turnos);
      setHistorialTotal(data.total);
    } catch (error) {
      console.error('Error fetching historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  }, [historialPage, historialLimit]);

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistorial();
    }
  }, [activeTab, fetchHistorial]);

  // ---- Filter handlers ----
  const applyFilters = async () => {
    setLoadingHistorial(true);
    setHistorialPage(0);
    try {
      // If searching by turno ID, use the specific endpoint
      if (filterTurnoId.trim()) {
        try {
          const turno = await turnoService.getTurno(Number(filterTurnoId));
          // Convert single turno to historial format
          setHistorial([
            {
              id_turno: turno.id_turno,
              fecha: String(turno.fecha),
              hora_inicio: turno.hora_inicio ? String(turno.hora_inicio) : null,
              hora_cierre: turno.hora_cierre ? String(turno.hora_cierre) : null,
              estado: turno.estado?.value || turno.estado || 'CERRADO',
              gerente: 'N/A',
              total_ventas: turno.total_ventas || 0,
              total_cobros: turno.total_cobros || 0,
              total_rake: turno.total_rake || 0,
              total_mesas: turno.mesas_activas || 0,
              ganancia: turno.total_rake || 0,
            },
          ]);
          setHistorialTotal(1);
        } catch {
          setHistorial([]);
          setHistorialTotal(0);
        }
      } else {
        // Date-based filter using historial endpoint
        const params: Record<string, string | number> = {
          limit: historialLimit,
          offset: 0,
        };

        // If dates are provided, we fetch all and filter client-side
        // (or use the /turnos endpoint with fecha_inicio and fecha_fin)
        if (filterFechaInicio || filterFechaFin) {
          // Use the turnos list endpoint which supports date filtering
          const turnosParams: Record<string, string> = {};
          if (filterFechaInicio) turnosParams.fecha_inicio = filterFechaInicio;
          if (filterFechaFin) turnosParams.fecha_fin = filterFechaFin;

          const turnos = await turnoService.getTurnos(turnosParams);
          // Map to historial format
          const mapped = (Array.isArray(turnos) ? turnos : []).map((t: any) => ({
            id_turno: t.id_turno,
            fecha: String(t.fecha),
            hora_inicio: t.hora_inicio ? String(t.hora_inicio) : null,
            hora_cierre: t.hora_cierre ? String(t.hora_cierre) : null,
            estado: t.estado?.value || t.estado || 'CERRADO',
            gerente: t.gerente?.apodo || t.gerente?.nombre_completo || 'N/A',
            total_ventas: 0,
            total_cobros: 0,
            total_rake: 0,
            total_mesas: 0,
            ganancia: 0,
          }));
          setHistorial(mapped);
          setHistorialTotal(mapped.length);
        } else {
          const data: HistorialResponse = await turnoService.getHistorial(params);
          setHistorial(data.turnos);
          setHistorialTotal(data.total);
        }
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const clearFilters = () => {
    setFilterFechaInicio('');
    setFilterFechaFin('');
    setFilterTurnoId('');
    setHistorialPage(0);
    fetchHistorial();
  };

  const hasActiveFilters = filterFechaInicio || filterFechaFin || filterTurnoId;

  // ---- Pagination ----
  const totalPages = Math.ceil(historialTotal / historialLimit);

  // ---- Derived ----
  const turno = turnoActivo?.turno;
  const gananciaEstimada = turno
    ? (turno.total_rake || 0) + (turno.total_propinas || 0) * 0.1 - (turno.total_gastos || 0)
    : 0;

  // ---- Loading for active tab ----
  if (loadingActivo && activeTab === 'activo') {
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
          <h1 className="text-2xl font-bold text-pearl">
            Bienvenido, {user?.apodo || user?.nombre_completo?.split(' ')[0]}
          </h1>
          <p className="text-silver">Panel de control del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          {turnoActivo?.hay_turno_activo ? (
            <Badge variant="success" size="md">
              <span className="w-2 h-2 bg-emerald rounded-full mr-2 animate-pulse" />
              Turno #{turno?.id_turno} Activo
            </Badge>
          ) : (
            <Badge variant="warning" size="md">
              Sin Turno
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-charcoal border border-graphite rounded-xl p-1">
        <button
          onClick={() => setActiveTab('activo')}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'activo'
              ? 'bg-gold/10 text-gold border border-gold/30'
              : 'text-silver hover:text-pearl hover:bg-graphite/50'
          }`}
        >
          <Zap className="w-4 h-4" />
          Turno Activo
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'historial'
              ? 'bg-gold/10 text-gold border border-gold/30'
              : 'text-silver hover:text-pearl hover:bg-graphite/50'
          }`}
        >
          <History className="w-4 h-4" />
          Historial de Turnos
        </button>
      </div>

      {/* ================================================================ */}
      {/* TAB: TURNO ACTIVO                                                */}
      {/* ================================================================ */}
      {activeTab === 'activo' && (
        <div className="space-y-6">
          {/* Alert if no turno */}
          {!turnoActivo?.hay_turno_activo && (
            <Alert type="warning" title="No hay turno activo">
              <p className="mb-3">
                Para comenzar las operaciones del día, es necesario abrir un nuevo turno.
              </p>
              {isGerente() && (
                <Button size="sm" onClick={() => navigate('/turno')}>
                  <Play className="w-4 h-4" />
                  Ir a Abrir Turno
                </Button>
              )}
            </Alert>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Ventas"
              value={formatCurrency(turno?.total_ventas || 0)}
              icon={<DollarSign className="w-6 h-6" />}
              color="emerald"
            />
            <StatCard
              label="Total Cobros"
              value={formatCurrency(turno?.total_cobros || 0)}
              icon={<DollarSign className="w-6 h-6" />}
              color="sapphire"
            />
            <StatCard
              label="Rake Recolectado"
              value={formatCurrency(turno?.total_rake || 0)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="gold"
            />
            <StatCard
              label="Ganancia Estimada"
              value={formatCurrency(gananciaEstimada)}
              icon={<TrendingUp className="w-6 h-6" />}
              color={gananciaEstimada >= 0 ? 'emerald' : 'ruby'}
            />
          </div>

          {/* Turno Info */}
          {turnoActivo?.hay_turno_activo && turno && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-pearl">Turno Actual</h3>
                <Link to="/turno">
                  <Button variant="secondary" size="sm">
                    Ver Detalles
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-silver mb-1">Fecha</p>
                  <p className="text-pearl font-medium">
                    {new Date(turno.fecha).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-silver mb-1">Hora Inicio</p>
                  <p className="text-pearl font-medium">{formatTime(turno.hora_inicio)}</p>
                </div>
                <div>
                  <p className="text-sm text-silver mb-1">Propinas</p>
                  <p className="text-amber font-medium">
                    {formatCurrency(turno.total_propinas || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-silver mb-1">Gastos</p>
                  <p className="text-ruby font-medium">
                    {formatCurrency(turno.total_gastos || 0)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickActionCard icon="🎰" label="Mesas" description="Gestionar sesiones" href="/mesas" />
            <QuickActionCard icon="👥" label="Jugadores" description="Ver jugadores" href="/jugadores" />
            <QuickActionCard icon="🪙" label="Fichas" description="Inventario" href="/fichas" />
            <QuickActionCard icon="💵" label="Ventas" description="Registrar ventas" href="/caja/ventas" />
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB: HISTORIAL DE TURNOS                                         */}
      {/* ================================================================ */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-lg font-semibold text-pearl">Historial de Turnos</h3>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-ruby bg-ruby/10 border border-ruby/20 rounded-lg hover:bg-ruby/20 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Limpiar filtros
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showFilters
                      ? 'bg-gold/10 text-gold border border-gold/30'
                      : 'bg-graphite/50 text-silver hover:text-pearl border border-graphite'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                  {hasActiveFilters && (
                    <span className="w-2 h-2 bg-gold rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-graphite">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Turno ID */}
                  <div>
                    <label className="block text-sm text-silver mb-1.5">Buscar por # Turno</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver" />
                      <input
                        type="number"
                        value={filterTurnoId}
                        onChange={(e) => setFilterTurnoId(e.target.value)}
                        placeholder="Ej: 42"
                        className="w-full pl-10 pr-3 py-2 bg-midnight border border-graphite rounded-lg text-pearl placeholder-silver/50 text-sm focus:outline-none focus:border-gold/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Fecha Inicio */}
                  <div>
                    <label className="block text-sm text-silver mb-1.5">Fecha Inicio</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver" />
                      <input
                        type="date"
                        value={filterFechaInicio}
                        onChange={(e) => setFilterFechaInicio(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-midnight border border-graphite rounded-lg text-pearl text-sm focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Fecha Fin */}
                  <div>
                    <label className="block text-sm text-silver mb-1.5">Fecha Fin</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver" />
                      <input
                        type="date"
                        value={filterFechaFin}
                        onChange={(e) => setFilterFechaFin(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-midnight border border-graphite rounded-lg text-pearl text-sm focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button size="sm" onClick={applyFilters}>
                    <Search className="w-4 h-4" />
                    Buscar
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Summary Stats */}
          {historial.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-charcoal border border-graphite rounded-xl p-4">
                <p className="text-xs text-silver mb-1">Turnos</p>
                <p className="text-xl font-bold text-pearl">{historialTotal}</p>
              </div>
              <div className="bg-charcoal border border-graphite rounded-xl p-4">
                <p className="text-xs text-silver mb-1">Ventas Total</p>
                <p className="text-xl font-bold text-emerald">
                  {formatCurrency(historial.reduce((sum, t) => sum + t.total_ventas, 0))}
                </p>
              </div>
              <div className="bg-charcoal border border-graphite rounded-xl p-4">
                <p className="text-xs text-silver mb-1">Rake Total</p>
                <p className="text-xl font-bold text-gold">
                  {formatCurrency(historial.reduce((sum, t) => sum + t.total_rake, 0))}
                </p>
              </div>
              <div className="bg-charcoal border border-graphite rounded-xl p-4">
                <p className="text-xs text-silver mb-1">Cobros Total</p>
                <p className="text-xl font-bold text-sapphire">
                  {formatCurrency(historial.reduce((sum, t) => sum + t.total_cobros, 0))}
                </p>
              </div>
            </div>
          )}

          {/* Table */}
          <Card>
            {loadingHistorial ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            ) : historial.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-silver/30 mx-auto mb-3" />
                <p className="text-silver">No se encontraron turnos</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-sm text-gold hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-graphite">
                        <th className="text-left text-xs font-medium text-silver uppercase tracking-wider py-3 px-4">
                          #
                        </th>
                        <th className="text-left text-xs font-medium text-silver uppercase tracking-wider py-3 px-4">
                          Fecha
                        </th>
                        <th className="text-left text-xs font-medium text-silver uppercase tracking-wider py-3 px-4">
                          Horario
                        </th>
                        <th className="text-left text-xs font-medium text-silver uppercase tracking-wider py-3 px-4">
                          Gerente
                        </th>
                        <th className="text-left text-xs font-medium text-silver uppercase tracking-wider py-3 px-4">
                          Estado
                        </th>
                        <th className="text-right text-xs font-medium text-silver uppercase tracking-wider py-3 px-4">
                          Ventas
                        </th>
                        <th className="text-right text-xs font-medium text-silver uppercase tracking-wider py-3 px-4">
                          Cobros
                        </th>
                        <th className="text-right text-xs font-medium text-silver uppercase tracking-wider py-3 px-4">
                          Rake
                        </th>
                        <th className="text-right text-xs font-medium text-silver uppercase tracking-wider py-3 px-4">
                          Mesas
                        </th>
                        <th className="text-center text-xs font-medium text-silver uppercase tracking-wider py-3 px-4">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-graphite/50">
                      {historial.map((t) => (
                        <tr
                          key={t.id_turno}
                          className="hover:bg-graphite/20 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="text-gold font-mono font-medium">#{t.id_turno}</span>
                          </td>
                          <td className="py-3 px-4 text-pearl text-sm">{formatDate(t.fecha)}</td>
                          <td className="py-3 px-4 text-silver text-sm">
                            {formatTime(t.hora_inicio)} → {formatTime(t.hora_cierre)}
                          </td>
                          <td className="py-3 px-4 text-pearl text-sm">{t.gerente}</td>
                          <td className="py-3 px-4">{estadoBadge(t.estado)}</td>
                          <td className="py-3 px-4 text-right text-emerald text-sm font-medium">
                            {formatCurrency(t.total_ventas)}
                          </td>
                          <td className="py-3 px-4 text-right text-sapphire text-sm font-medium">
                            {formatCurrency(t.total_cobros)}
                          </td>
                          <td className="py-3 px-4 text-right text-gold text-sm font-medium">
                            {formatCurrency(t.total_rake)}
                          </td>
                          <td className="py-3 px-4 text-right text-pearl text-sm">
                            {t.total_mesas}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link to={`/turno/${t.id_turno}`}>
                              <Button variant="ghost" size="sm">
                                Ver
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {historial.map((t) => (
                    <Link
                      key={t.id_turno}
                      to={`/turno/${t.id_turno}`}
                      className="block bg-midnight border border-graphite rounded-xl p-4 hover:border-gold/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gold font-mono font-medium">Turno #{t.id_turno}</span>
                        {estadoBadge(t.estado)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-silver">Fecha: </span>
                          <span className="text-pearl">{formatDate(t.fecha)}</span>
                        </div>
                        <div>
                          <span className="text-silver">Gerente: </span>
                          <span className="text-pearl">{t.gerente}</span>
                        </div>
                        <div>
                          <span className="text-silver">Ventas: </span>
                          <span className="text-emerald font-medium">
                            {formatCurrency(t.total_ventas)}
                          </span>
                        </div>
                        <div>
                          <span className="text-silver">Rake: </span>
                          <span className="text-gold font-medium">
                            {formatCurrency(t.total_rake)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && !hasActiveFilters && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-graphite">
                    <p className="text-sm text-silver">
                      Mostrando {historialPage * historialLimit + 1}-
                      {Math.min((historialPage + 1) * historialLimit, historialTotal)} de{' '}
                      {historialTotal}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHistorialPage((p) => Math.max(0, p - 1))}
                        disabled={historialPage === 0}
                        className="p-2 rounded-lg bg-graphite/50 text-silver hover:text-pearl disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-pearl font-medium px-2">
                        {historialPage + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setHistorialPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={historialPage >= totalPages - 1}
                        className="p-2 rounded-lg bg-graphite/50 text-silver hover:text-pearl disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUICK ACTION CARD
// ============================================================================

function QuickActionCard({
  icon,
  label,
  description,
  href,
}: {
  icon: string;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="bg-charcoal border border-graphite rounded-xl p-5 hover:border-gold/50 transition-all duration-200 group"
    >
      <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">
        {icon}
      </span>
      <h3 className="font-medium text-pearl mb-1">{label}</h3>
      <p className="text-sm text-silver">{description}</p>
    </Link>
  );
}