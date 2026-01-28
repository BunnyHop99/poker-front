import { useEffect, useState } from 'react';
import { DollarSign, Clock, User, Image, CheckCircle, XCircle } from 'lucide-react';
import { Button, Card, Badge, Table, StatCard, Alert } from '../components/ui';
import api from '../services/api';

interface Rake {
  id_rake: number;
  id_sesion: number;
  monto: number;
  tipo_recoleccion: string;
  foto_url: string;
  validado: boolean;
  huella_gerente_validada: boolean;
  huella_testigo_validada: boolean;
  created_at: string;
  dealer?: { nombre_completo: string; apodo: string };
  mesa_numero?: number;
}

interface ResumenRake {
  total_rake: number;
  total_recolecciones: number;
  pendientes_validacion: number;
  por_mesa: { mesa: number; total: number }[];
  por_dealer: { dealer: string; total: number }[];
}

export default function RakePage() {
  const [rakes, setRakes] = useState<Rake[]>([]);
  const [resumen, setResumen] = useState<ResumenRake | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [rakesRes, resumenRes] = await Promise.all([
        api.get('/rake'),
        api.get('/rake/resumen'),
      ]);
      setRakes(rakesRes.data || []);
      setResumen(resumenRes.data);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || 'Error al cargar datos de rake');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;
  if (error) return <Alert type="error">{error}</Alert>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-pearl">Rake del Turno</h1>
        <p className="text-silver">Control de recolección de rake por mesa</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Rake" value={formatCurrency(resumen?.total_rake || 0)} icon={<DollarSign className="w-6 h-6" />} color="gold" />
        <StatCard label="Recolecciones" value={resumen?.total_recolecciones || 0} icon={<Clock className="w-6 h-6" />} color="sapphire" />
        <StatCard label="Pendientes" value={resumen?.pendientes_validacion || 0} icon={<XCircle className="w-6 h-6" />} color={resumen?.pendientes_validacion ? 'amber' : 'emerald'} />
        <StatCard label="Promedio" value={formatCurrency((resumen?.total_rake || 0) / Math.max(resumen?.total_recolecciones || 1, 1))} icon={<DollarSign className="w-6 h-6" />} color="emerald" />
      </div>

      {/* Por Mesa y Dealer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Rake por Mesa">
          {resumen?.por_mesa && resumen.por_mesa.length > 0 ? (
            <div className="space-y-3">
              {resumen.por_mesa.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-graphite last:border-0">
                  <span className="text-pearl">Mesa {item.mesa}</span>
                  <span className="text-gold font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-silver text-center py-4">Sin datos de rake por mesa</p>
          )}
        </Card>

        <Card title="Rake por Dealer">
          {resumen?.por_dealer && resumen.por_dealer.length > 0 ? (
            <div className="space-y-3">
              {resumen.por_dealer.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-graphite last:border-0">
                  <span className="text-pearl">{item.dealer}</span>
                  <span className="text-gold font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-silver text-center py-4">Sin datos de rake por dealer</p>
          )}
        </Card>
      </div>

      {/* Lista de Rakes */}
      <Card title="Recolecciones del Turno" noPadding>
        {rakes.length === 0 ? (
          <p className="text-silver text-center py-8">No hay recolecciones de rake registradas</p>
        ) : (
          <Table
            columns={[
              { key: 'hora', header: 'Hora', render: (r) => formatTime(r.created_at) },
              { key: 'mesa', header: 'Mesa', render: (r) => `Mesa ${r.mesa_numero || r.id_sesion}` },
              { key: 'dealer', header: 'Dealer', render: (r) => r.dealer?.apodo || r.dealer?.nombre_completo || 'N/A' },
              { key: 'tipo', header: 'Tipo', render: (r) => <Badge variant="default">{r.tipo_recoleccion}</Badge> },
              { key: 'monto', header: 'Monto', render: (r) => <span className="text-gold font-medium">{formatCurrency(r.monto)}</span> },
              {
                key: 'validado',
                header: 'Estado',
                render: (r) => r.validado ? (
                  <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Validado</Badge>
                ) : (
                  <Badge variant="warning"><XCircle className="w-3 h-3 mr-1" />Pendiente</Badge>
                ),
              },
            ]}
            data={rakes}
            keyExtractor={(r) => r.id_rake}
          />
        )}
      </Card>
    </div>
  );
}
