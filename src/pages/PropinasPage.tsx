import { useEffect, useState } from 'react';
import { DollarSign, User, CheckCircle, Plus, Search } from 'lucide-react';
import { Button, Card, Badge, Table, StatCard, Modal, Input, Alert } from '../components/ui';
import api from '../services/api';

interface Propina {
  id_propina: number;
  monto: number;
  comision_casa: number;
  monto_neto: number;
  pagada: boolean;
  created_at: string;
  personal?: { id_personal: number; nombre_completo: string; apodo: string; tipo: string };
  jugador?: { nombre_completo: string; apodo: string };
}

interface Personal {
  id_personal: number;
  nombre_completo: string;
  apodo: string;
  tipo: string;
}

interface Totales {
  total_propinas: number;
  total_comision_casa: number;
  total_neto: number;
  total_pagado: number;
  total_pendiente: number;
}

export default function PropinasPage() {
  const [propinas, setPropinas] = useState<Propina[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [form, setForm] = useState({ id_personal: '', monto: '' });

  const fetchData = async () => {
    try {
      setError(null);
      const [propinasRes, totalesRes, personalRes] = await Promise.all([
        api.get('/propinas'),
        api.get('/propinas/totales'),
        api.get('/personal?activos=true'),
      ]);
      setPropinas(propinasRes.data || []);
      setTotales(totalesRes.data);
      setPersonal(personalRes.data || []);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || 'Error al cargar propinas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRegistrar = async () => {
    if (!form.id_personal || !form.monto) return;
    setProcesando(true);
    try {
      await api.post('/propinas', {
        id_personal: Number(form.id_personal),
        monto: Number(form.monto),
      });
      setModalOpen(false);
      setForm({ id_personal: '', monto: '' });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al registrar propina');
    } finally {
      setProcesando(false);
    }
  };

  const handlePagar = async (id: number) => {
    try {
      await api.post(`/propinas/${id}/pagar`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al pagar propina');
    }
  };

  const handlePagarTodas = async () => {
    const pendientes = propinas.filter(p => !p.pagada).map(p => p.id_propina);
    if (pendientes.length === 0) return;
    try {
      await api.post('/propinas/pagar-multiple', { ids_propinas: pendientes });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al pagar propinas');
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const pendientes = propinas.filter(p => !p.pagada);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;
  if (error) return <Alert type="error">{error}</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pearl">Propinas</h1>
          <p className="text-silver">Gestión de propinas del personal</p>
        </div>
        <div className="flex gap-2">
          {pendientes.length > 0 && (
            <Button variant="secondary" onClick={handlePagarTodas}>
              <CheckCircle className="w-4 h-4" />
              Pagar Todas ({pendientes.length})
            </Button>
          )}
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Registrar Propina
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Propinas" value={formatCurrency(totales?.total_propinas || 0)} icon={<DollarSign className="w-6 h-6" />} color="gold" />
        <StatCard label="Comisión Casa (10%)" value={formatCurrency(totales?.total_comision_casa || 0)} icon={<DollarSign className="w-6 h-6" />} color="sapphire" />
        <StatCard label="Total Neto" value={formatCurrency(totales?.total_neto || 0)} icon={<DollarSign className="w-6 h-6" />} color="emerald" />
        <StatCard label="Pagado" value={formatCurrency(totales?.total_pagado || 0)} icon={<CheckCircle className="w-6 h-6" />} color="emerald" />
        <StatCard label="Pendiente" value={formatCurrency(totales?.total_pendiente || 0)} icon={<User className="w-6 h-6" />} color={totales?.total_pendiente ? 'amber' : 'emerald'} />
      </div>

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <Alert type="warning" title={`${pendientes.length} propinas pendientes de pago`}>
          Total pendiente: {formatCurrency(pendientes.reduce((sum, p) => sum + p.monto_neto, 0))}
        </Alert>
      )}

      {/* Lista */}
      <Card title="Propinas del Turno" noPadding>
        {propinas.length === 0 ? (
          <p className="text-silver text-center py-8">No hay propinas registradas</p>
        ) : (
          <Table
            columns={[
              { key: 'hora', header: 'Hora', render: (p) => formatTime(p.created_at) },
              {
                key: 'personal',
                header: 'Empleado',
                render: (p) => (
                  <div>
                    <p className="text-pearl">{p.personal?.apodo || p.personal?.nombre_completo}</p>
                    <p className="text-xs text-silver">{p.personal?.tipo}</p>
                  </div>
                ),
              },
              { key: 'jugador', header: 'De Jugador', render: (p) => p.jugador?.apodo || p.jugador?.nombre_completo || '-' },
              { key: 'monto', header: 'Monto', render: (p) => formatCurrency(p.monto) },
              { key: 'comision', header: 'Comisión', render: (p) => <span className="text-silver">{formatCurrency(p.comision_casa)}</span> },
              { key: 'neto', header: 'Neto', render: (p) => <span className="text-gold font-medium">{formatCurrency(p.monto_neto)}</span> },
              {
                key: 'estado',
                header: 'Estado',
                render: (p) => p.pagada ? (
                  <Badge variant="success">Pagada</Badge>
                ) : (
                  <Button size="sm" onClick={() => handlePagar(p.id_propina)}>Pagar</Button>
                ),
              },
            ]}
            data={propinas}
            keyExtractor={(p) => p.id_propina}
          />
        )}
      </Card>

      {/* Modal Registrar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar Propina"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegistrar} isLoading={procesando}>Registrar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-silver mb-2">Empleado</label>
            <select
              value={form.id_personal}
              onChange={(e) => setForm({ ...form, id_personal: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate border border-graphite rounded-lg text-pearl focus:outline-none focus:border-gold"
            >
              <option value="">Seleccionar empleado...</option>
              {personal.filter(p => ['DEALER', 'MESERO'].includes(p.tipo)).map((p) => (
                <option key={p.id_personal} value={p.id_personal}>
                  {p.apodo || p.nombre_completo} ({p.tipo})
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Monto"
            type="number"
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value })}
            placeholder="0.00"
          />
          {form.monto && Number(form.monto) > 0 && (
            <div className="p-3 bg-slate rounded-lg text-sm">
              <div className="flex justify-between"><span className="text-silver">Comisión casa (10%):</span><span className="text-pearl">{formatCurrency(Number(form.monto) * 0.1)}</span></div>
              <div className="flex justify-between mt-1"><span className="text-silver">Neto empleado:</span><span className="text-gold font-medium">{formatCurrency(Number(form.monto) * 0.9)}</span></div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
