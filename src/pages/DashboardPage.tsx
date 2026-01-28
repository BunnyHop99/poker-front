import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  DollarSign,
  Users,
  Layers,
  TrendingUp,
  Play,
} from 'lucide-react';
import { Button, Card, StatCard, Badge, Alert } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { turnoService } from '../services/api';

interface TurnoActivo {
  hay_turno_activo: boolean;
  turno?: {
    id_turno: number;
    fecha: string;
    hora_inicio: string;
    estado: string;
    total_ventas?: number;
    total_cobros?: number;
    total_rake?: number;
    total_propinas?: number;
    total_gastos?: number;
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isGerente } = useAuthStore();
  const [turnoActivo, setTurnoActivo] = useState<TurnoActivo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTurno = async () => {
    try {
      const data = await turnoService.getTurnoActivo();
      setTurnoActivo(data);
    } catch (error) {
      console.error('Error fetching turno:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTurno();
    const interval = setInterval(fetchTurno, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value || 0);
  };

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const turno = turnoActivo?.turno;
  const gananciaEstimada = turno
    ? (turno.total_rake || 0) + (turno.total_propinas || 0) * 0.1 - (turno.total_gastos || 0)
    : 0;

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

      {/* Alerta de turno - Redirige a /turno */}
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
              <Button variant="secondary" size="sm">Ver Detalles</Button>
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
              <p className="text-pearl font-medium">
                {formatTime(turno.hora_inicio)}
              </p>
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
  );
}

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
