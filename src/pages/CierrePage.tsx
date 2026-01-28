import { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, AlertTriangle, DollarSign } from 'lucide-react';
import { Button, Card, Badge, Alert, StatCard } from '../components/ui';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface CierrePreview {
  puede_cerrar: boolean;
  problemas: string[];
  advertencias: string[];
  
  // Ingresos
  total_ventas_efectivo: number;
  total_ventas_tarjeta: number;
  total_cobros: number;
  total_rake: number;
  total_propinas: number;
  comision_propinas: number;
  
  // Egresos
  total_gastos: number;
  total_propinas_pagadas: number;
  
  // Fichas
  saldo_inicial_caja: number;
  valor_fichas_caja: number;
  valor_fichas_circulacion: number;
  
  // Cuadre
  efectivo_esperado: number;
  efectivo_real: number;
  diferencia: number;
  cuadre_ok: boolean;
  
  // Resumen
  ganancia_bruta: number;
  ganancia_neta: number;
}

export default function CierrePage() {
  const { isGerente } = useAuthStore();
  const [preview, setPreview] = useState<CierrePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const fetchPreview = async () => {
    try {
      setError(null);
      const response = await api.get('/cierre/preview');
      setPreview(response.data);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || 'Error al cargar preview de cierre');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPreview(); }, []);

  const handleCierre = async (forzar: boolean = false) => {
    if (!preview?.puede_cerrar && !forzar) {
      alert('Hay problemas que deben resolverse antes de cerrar');
      return;
    }
    
    setProcesando(true);
    try {
      await api.post('/cierre', { forzar, notas: '' });
      alert('Cierre realizado correctamente');
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al realizar cierre');
    } finally {
      setProcesando(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!preview) return <Alert type="warning">No hay turno activo para cerrar</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pearl">Cierre del Día</h1>
          <p className="text-silver">Resumen y validación para cierre de turno</p>
        </div>
        {isGerente() && (
          <div className="flex gap-2">
            {!preview.puede_cerrar && preview.problemas.length > 0 && (
              <Button variant="danger" onClick={() => handleCierre(true)} isLoading={procesando}>
                <AlertTriangle className="w-4 h-4" />
                Forzar Cierre
              </Button>
            )}
            <Button
              onClick={() => handleCierre(false)}
              isLoading={procesando}
              disabled={!preview.puede_cerrar}
            >
              <FileText className="w-4 h-4" />
              Realizar Cierre
            </Button>
          </div>
        )}
      </div>

      {/* Estado del Cierre */}
      {preview.puede_cerrar ? (
        <Alert type="success" title="Listo para cerrar">
          Todas las validaciones pasaron correctamente. Puede proceder con el cierre.
        </Alert>
      ) : (
        <Alert type="error" title="No se puede cerrar">
          Hay {preview.problemas.length} problema(s) que deben resolverse.
        </Alert>
      )}

      {/* Problemas */}
      {preview.problemas.length > 0 && (
        <Card title="Problemas a Resolver" className="border-ruby/50">
          <ul className="space-y-2">
            {preview.problemas.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-ruby">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Advertencias */}
      {preview.advertencias.length > 0 && (
        <Card title="Advertencias" className="border-amber/50">
          <ul className="space-y-2">
            {preview.advertencias.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-amber">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Resumen Financiero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ganancia Bruta" value={formatCurrency(preview.ganancia_bruta)} icon={<DollarSign className="w-6 h-6" />} color="gold" />
        <StatCard label="Ganancia Neta" value={formatCurrency(preview.ganancia_neta)} icon={<DollarSign className="w-6 h-6" />} color="emerald" />
        <StatCard label="Total Gastos" value={formatCurrency(preview.total_gastos)} icon={<DollarSign className="w-6 h-6" />} color="ruby" />
        <StatCard
          label="Cuadre"
          value={preview.cuadre_ok ? 'OK' : formatCurrency(preview.diferencia)}
          icon={preview.cuadre_ok ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          color={preview.cuadre_ok ? 'emerald' : 'ruby'}
        />
      </div>

      {/* Detalle de Ingresos */}
      <Card title="Ingresos">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-silver font-medium">Ventas</h4>
            <div className="flex justify-between py-2 border-b border-graphite">
              <span className="text-silver">Efectivo</span>
              <span className="text-emerald">{formatCurrency(preview.total_ventas_efectivo)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-graphite">
              <span className="text-silver">Tarjeta</span>
              <span className="text-emerald">{formatCurrency(preview.total_ventas_tarjeta)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-graphite">
              <span className="text-silver">Cobros de Crédito</span>
              <span className="text-emerald">{formatCurrency(preview.total_cobros)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-silver font-medium">Rake y Propinas</h4>
            <div className="flex justify-between py-2 border-b border-graphite">
              <span className="text-silver">Rake Total</span>
              <span className="text-gold">{formatCurrency(preview.total_rake)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-graphite">
              <span className="text-silver">Propinas</span>
              <span className="text-pearl">{formatCurrency(preview.total_propinas)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-graphite">
              <span className="text-silver">Comisión Propinas (10%)</span>
              <span className="text-gold">{formatCurrency(preview.comision_propinas)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Detalle de Egresos */}
      <Card title="Egresos">
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-graphite">
            <span className="text-silver">Gastos Operativos</span>
            <span className="text-ruby">{formatCurrency(preview.total_gastos)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-graphite">
            <span className="text-silver">Propinas Pagadas</span>
            <span className="text-ruby">{formatCurrency(preview.total_propinas_pagadas)}</span>
          </div>
        </div>
      </Card>

      {/* Cuadre de Caja */}
      <Card title="Cuadre de Caja">
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-graphite">
            <span className="text-silver">Saldo Inicial</span>
            <span className="text-pearl">{formatCurrency(preview.saldo_inicial_caja)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-graphite">
            <span className="text-silver">Fichas en Caja</span>
            <span className="text-pearl">{formatCurrency(preview.valor_fichas_caja)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-graphite">
            <span className="text-silver">Fichas en Circulación</span>
            <span className="text-amber">{formatCurrency(preview.valor_fichas_circulacion)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-graphite">
            <span className="text-silver">Efectivo Esperado</span>
            <span className="text-pearl">{formatCurrency(preview.efectivo_esperado)}</span>
          </div>
          <div className="flex justify-between py-3 text-lg">
            <span className="text-pearl font-bold">Diferencia</span>
            <span className={`font-bold ${preview.cuadre_ok ? 'text-emerald' : 'text-ruby'}`}>
              {preview.cuadre_ok ? '✓ Cuadra' : formatCurrency(preview.diferencia)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
