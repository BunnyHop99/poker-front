import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Package, Plus, Zap } from 'lucide-react';
import { Button, Card, Alert, StatCard, Modal, Input } from '../components/ui';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Ficha {
  id_ficha: number;
  denominacion: number;
  color: string;
  cantidad_boveda: number;
  cantidad_caja: number;
  cantidad_circulacion: number;
  cantidad_total: number;
  valor_total: number;
  valor_boveda: number;
  valor_caja: number;
}

interface Inventario {
  fichas: Ficha[];
  total_fichas: number;
  valor_total: number;
  valor_boveda: number;
  valor_caja: number;
  valor_circulacion: number;
}

export default function FichasPage() {
  const { isGerente } = useAuthStore();
  const [inventario, setInventario] = useState<Inventario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modales
  const [retiroModal, setRetiroModal] = useState(false);
  const [crearFichaModal, setCrearFichaModal] = useState(false);
  const [seedModal, setSeedModal] = useState(false);
  
  // Form crear ficha
  const [nuevaFicha, setNuevaFicha] = useState({ denominacion: '', cantidad: '', color: '#D4AF37' });
  const [procesando, setProcesando] = useState(false);

  const fetchInventario = async () => {
    try {
      setError(null);
      const response = await api.get('/fichas/inventario');
      setInventario(response.data);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || 'Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventario(); }, []);

  const handleRetiroEstandar = async () => {
    setProcesando(true);
    try {
      await api.post('/fichas/boveda/retiro-estandar', {});
      await fetchInventario();
      setRetiroModal(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al realizar retiro');
    } finally {
      setProcesando(false);
    }
  };

  const handleCrearFicha = async () => {
    if (!nuevaFicha.denominacion || !nuevaFicha.cantidad) {
      alert('Denominación y cantidad son requeridos');
      return;
    }
    setProcesando(true);
    try {
      await api.post('/fichas/', null, {
        params: {
          denominacion: Number(nuevaFicha.denominacion),
          cantidad_boveda: Number(nuevaFicha.cantidad),
          color: nuevaFicha.color
        }
      });
      setCrearFichaModal(false);
      setNuevaFicha({ denominacion: '', cantidad: '', color: '#D4AF37' });
      await fetchInventario();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al crear ficha');
    } finally {
      setProcesando(false);
    }
  };

  const handleSeedFichas = async () => {
    setProcesando(true);
    try {
      const response = await api.post('/fichas/seed');
      alert(response.data.message);
      setSeedModal(false);
      await fetchInventario();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al crear fichas');
    } finally {
      setProcesando(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const fichas = inventario?.fichas || [];
  const valorTotal = inventario?.valor_total || 0;
  const valorBoveda = inventario?.valor_boveda || 0;
  const valorCaja = inventario?.valor_caja || 0;
  const valorCirculacion = inventario?.valor_circulacion || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pearl">Inventario de Fichas</h1>
          <p className="text-silver">Control de fichas y bóveda</p>
        </div>
        <div className="flex gap-2">
          {isGerente() && fichas.length === 0 && (
            <Button variant="secondary" onClick={() => setSeedModal(true)}>
              <Zap className="w-4 h-4" />
              Crear Fichas Estándar
            </Button>
          )}
          {isGerente() && (
            <Button variant="secondary" onClick={() => setCrearFichaModal(true)}>
              <Plus className="w-4 h-4" />
              Nueva Ficha
            </Button>
          )}
          {isGerente() && fichas.length > 0 && (
            <Button onClick={() => setRetiroModal(true)}>
              <ArrowDown className="w-4 h-4" />
              Retiro Estándar
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Sin fichas - Mensaje de ayuda */}
      {fichas.length === 0 && (
        <Alert type="info" title="No hay fichas registradas">
          Para comenzar, crea las fichas estándar o agrega fichas manualmente.
          Las fichas son necesarias para abrir turnos y realizar operaciones.
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Inventario" value={formatCurrency(valorTotal)} icon={<Package className="w-6 h-6" />} color="gold" />
        <StatCard label="Bóveda" value={formatCurrency(valorBoveda)} icon={<ArrowUp className="w-6 h-6" />} color="sapphire" />
        <StatCard label="Caja" value={formatCurrency(valorCaja)} icon={<ArrowDown className="w-6 h-6" />} color="emerald" />
        <StatCard label="Circulación" value={formatCurrency(valorCirculacion)} icon={<Package className="w-6 h-6" />} color="ruby" />
      </div>

      {/* Tabla de fichas */}
      {fichas.length > 0 && (
        <Card title="Detalle por Denominación" noPadding>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-graphite">
                  <th className="px-4 py-3 text-left text-sm text-silver">Ficha</th>
                  <th className="px-4 py-3 text-right text-sm text-silver">Bóveda</th>
                  <th className="px-4 py-3 text-right text-sm text-silver">Caja</th>
                  <th className="px-4 py-3 text-right text-sm text-silver">Circulación</th>
                  <th className="px-4 py-3 text-right text-sm text-silver">Total</th>
                  <th className="px-4 py-3 text-right text-sm text-silver">Valor Bóveda</th>
                  <th className="px-4 py-3 text-right text-sm text-silver">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {fichas.map((f) => (
                  <tr key={f.id_ficha} className="border-b border-graphite/50 hover:bg-slate/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                          style={{ 
                            backgroundColor: f.color || '#D4AF37',
                            color: ['#FFFFFF', '#FFD700', '#FFA500', '#FFFF00'].includes(f.color?.toUpperCase()) ? '#000' : '#FFF'
                          }}
                        >
                          ${f.denominacion >= 1000 ? `${f.denominacion/1000}K` : f.denominacion}
                        </div>
                        <span className="text-pearl font-medium">{formatCurrency(f.denominacion)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-pearl">{f.cantidad_boveda}</td>
                    <td className="px-4 py-3 text-right text-emerald">{f.cantidad_caja}</td>
                    <td className="px-4 py-3 text-right text-amber">{f.cantidad_circulacion}</td>
                    <td className="px-4 py-3 text-right text-pearl font-medium">{f.cantidad_total}</td>
                    <td className="px-4 py-3 text-right text-sapphire font-medium">{formatCurrency(f.valor_boveda || f.denominacion * f.cantidad_boveda)}</td>
                    <td className="px-4 py-3 text-right text-gold font-bold">{formatCurrency(f.valor_total || f.denominacion * f.cantidad_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate/50">
                  <td className="px-4 py-3 text-pearl font-bold">TOTALES</td>
                  <td className="px-4 py-3 text-right text-pearl font-bold">{fichas.reduce((s, f) => s + f.cantidad_boveda, 0)}</td>
                  <td className="px-4 py-3 text-right text-emerald font-bold">{fichas.reduce((s, f) => s + f.cantidad_caja, 0)}</td>
                  <td className="px-4 py-3 text-right text-amber font-bold">{fichas.reduce((s, f) => s + f.cantidad_circulacion, 0)}</td>
                  <td className="px-4 py-3 text-right text-pearl font-bold">{fichas.reduce((s, f) => s + f.cantidad_total, 0)}</td>
                  <td className="px-4 py-3 text-right text-sapphire font-bold">{formatCurrency(valorBoveda)}</td>
                  <td className="px-4 py-3 text-right text-gold font-bold">{formatCurrency(valorTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Retiro Estándar */}
      <Modal 
        isOpen={retiroModal} 
        onClose={() => setRetiroModal(false)} 
        title="Retiro Estándar de Bóveda"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRetiroModal(false)}>Cancelar</Button>
            <Button onClick={handleRetiroEstandar} isLoading={procesando}>Confirmar Retiro</Button>
          </>
        }
      >
        <p className="text-silver">
          Se realizará un retiro de <span className="text-gold font-bold">$50,000</span> de la bóveda a la caja.
        </p>
        <p className="text-sm text-silver mt-2">
          Este es el monto estándar para iniciar operaciones diarias.
        </p>
      </Modal>

      {/* Modal Crear Ficha */}
      <Modal 
        isOpen={crearFichaModal} 
        onClose={() => setCrearFichaModal(false)} 
        title="Nueva Denominación de Ficha"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCrearFichaModal(false)}>Cancelar</Button>
            <Button onClick={handleCrearFicha} isLoading={procesando}>Crear Ficha</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Denominación ($)"
            type="number"
            value={nuevaFicha.denominacion}
            onChange={(e) => setNuevaFicha({ ...nuevaFicha, denominacion: e.target.value })}
            placeholder="Ej: 25, 100, 500..."
          />
          <Input
            label="Cantidad en Bóveda"
            type="number"
            value={nuevaFicha.cantidad}
            onChange={(e) => setNuevaFicha({ ...nuevaFicha, cantidad: e.target.value })}
            placeholder="Cantidad inicial"
          />
          <div>
            <label className="block text-sm font-medium text-silver mb-2">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={nuevaFicha.color}
                onChange={(e) => setNuevaFicha({ ...nuevaFicha, color: e.target.value })}
                className="w-12 h-12 rounded-lg cursor-pointer"
              />
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: nuevaFicha.color, color: '#000' }}
              >
                ${nuevaFicha.denominacion || '?'}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Seed Fichas */}
      <Modal 
        isOpen={seedModal} 
        onClose={() => setSeedModal(false)} 
        title="Crear Fichas Estándar"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSeedModal(false)}>Cancelar</Button>
            <Button onClick={handleSeedFichas} isLoading={procesando}>
              <Zap className="w-4 h-4" />
              Crear Todas
            </Button>
          </>
        }
      >
        <p className="text-silver mb-4">Se crearán las siguientes denominaciones estándar:</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { d: 5, c: 500, color: '#FFFFFF', name: 'Blanca' },
            { d: 10, c: 500, color: '#FF0000', name: 'Roja' },
            { d: 25, c: 400, color: '#00AA00', name: 'Verde' },
            { d: 50, c: 300, color: '#0000FF', name: 'Azul' },
            { d: 100, c: 200, color: '#000000', name: 'Negra' },
            { d: 500, c: 100, color: '#800080', name: 'Morada' },
            { d: 1000, c: 50, color: '#FFA500', name: 'Naranja' },
            { d: 5000, c: 20, color: '#FFD700', name: 'Dorada' },
          ].map((f) => (
            <div key={f.d} className="flex items-center gap-2 p-2 bg-slate rounded">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: f.color, color: f.color === '#FFFFFF' || f.color === '#FFD700' ? '#000' : '#FFF' }}
              >
                ${f.d >= 1000 ? `${f.d/1000}K` : f.d}
              </div>
              <div>
                <p className="text-pearl text-sm">${f.d} - {f.name}</p>
                <p className="text-silver text-xs">{f.c} unidades</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-gold font-medium mt-4">
          Total: {formatCurrency(5*500 + 10*500 + 25*400 + 50*300 + 100*200 + 500*100 + 1000*50 + 5000*20)}
        </p>
      </Modal>
    </div>
  );
}
