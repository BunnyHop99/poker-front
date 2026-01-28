import { useEffect, useState } from 'react';
import { Plus, Search, User, UserCog, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button, Card, Badge, Table, Modal, Input, Alert } from '../components/ui';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Personal {
  id_personal: number;
  nombre_completo: string;
  apodo: string | null;
  tipo: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  porcentaje_comision_propina: number;
  fecha_alta: string;
}

const TIPOS = ['GERENTE', 'CAJERO', 'DEALER', 'MESERO', 'HOST'];

export default function PersonalPage() {
  const { isGerente } = useAuthStore();
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Personal | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: '',
    apodo: '',
    email: '',
    telefono: '',
    tipo: 'DEALER',
    password: '',
    porcentaje_comision_propina: '0',
  });

  const fetchPersonal = async () => {
    try {
      setError(null);
      const params: any = { activos: !mostrarInactivos };
      if (filtroTipo) params.tipo = filtroTipo;
      const response = await api.get('/personal', { params });
      setPersonal(response.data || []);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.detail || 'Error al cargar personal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPersonal(); }, [filtroTipo, mostrarInactivos]);

  const handleBuscar = async () => {
    if (!searchTerm.trim()) {
      fetchPersonal();
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/personal/buscar', { params: { q: searchTerm } });
      setPersonal(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al buscar');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.nombre_completo || !form.email || !form.tipo) return;
    setProcesando(true);
    try {
      if (editando) {
        await api.put(`/personal/${editando.id_personal}`, {
          nombre_completo: form.nombre_completo,
          apodo: form.apodo || null,
          telefono: form.telefono || null,
          porcentaje_comision_propina: Number(form.porcentaje_comision_propina),
        });
      } else {
        await api.post('/personal', {
          ...form,
          porcentaje_comision_propina: Number(form.porcentaje_comision_propina),
        });
      }
      setModalOpen(false);
      setEditando(null);
      resetForm();
      await fetchPersonal();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setProcesando(false);
    }
  };

  const handleDesactivar = async (id: number) => {
    if (!confirm('¿Desactivar este empleado?')) return;
    try {
      await api.delete(`/personal/${id}`);
      await fetchPersonal();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al desactivar');
    }
  };

  const handleReactivar = async (id: number) => {
    try {
      await api.post(`/personal/${id}/reactivar`);
      await fetchPersonal();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al reactivar');
    }
  };

  const openEdit = (p: Personal) => {
    setEditando(p);
    setForm({
      nombre_completo: p.nombre_completo,
      apodo: p.apodo || '',
      email: p.email,
      telefono: p.telefono || '',
      tipo: p.tipo,
      password: '',
      porcentaje_comision_propina: String(p.porcentaje_comision_propina),
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setForm({
      nombre_completo: '',
      apodo: '',
      email: '',
      telefono: '',
      tipo: 'DEALER',
      password: '',
      porcentaje_comision_propina: '0',
    });
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, 'gold' | 'sapphire' | 'emerald' | 'amber' | 'default'> = {
      GERENTE: 'gold',
      CAJERO: 'sapphire',
      DEALER: 'emerald',
      MESERO: 'amber',
      HOST: 'default',
    };
    return <Badge variant={colors[tipo] || 'default'}>{tipo}</Badge>;
  };

  if (loading && personal.length === 0) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;
  if (error) return <Alert type="error">{error}</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pearl">Personal</h1>
          <p className="text-silver">Gestión de empleados del sistema</p>
        </div>
        {isGerente() && (
          <Button onClick={() => { resetForm(); setEditando(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Nuevo Empleado
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-silver" />
            <input
              type="text"
              placeholder="Buscar por nombre o apodo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              className="w-full pl-10 pr-4 py-2.5 bg-slate border border-graphite rounded-lg text-pearl placeholder:text-silver/60 focus:outline-none focus:border-gold"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-2.5 bg-slate border border-graphite rounded-lg text-pearl focus:outline-none focus:border-gold"
          >
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button
            variant={mostrarInactivos ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMostrarInactivos(!mostrarInactivos)}
          >
            {mostrarInactivos ? 'Ocultar' : 'Mostrar'} Inactivos
          </Button>
        </div>
      </Card>

      {/* Tabla */}
      <Card noPadding>
        <Table
          columns={[
            {
              key: 'nombre',
              header: 'Empleado',
              render: (p) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate flex items-center justify-center">
                    <User className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-medium text-pearl">{p.nombre_completo}</p>
                    {p.apodo && <p className="text-sm text-silver">"{p.apodo}"</p>}
                  </div>
                </div>
              ),
            },
            { key: 'tipo', header: 'Tipo', render: (p) => getTipoBadge(p.tipo) },
            { key: 'email', header: 'Email', render: (p) => <span className="text-silver">{p.email}</span> },
            { key: 'telefono', header: 'Teléfono', render: (p) => p.telefono || '-' },
            {
              key: 'estado',
              header: 'Estado',
              render: (p) => p.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="error">Inactivo</Badge>,
            },
            {
              key: 'acciones',
              header: '',
              className: 'text-right',
              render: (p) => isGerente() && (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  {p.activo ? (
                    <Button variant="ghost" size="sm" onClick={() => handleDesactivar(p.id_personal)}>
                      <Trash2 className="w-4 h-4 text-ruby" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handleReactivar(p.id_personal)}>
                      <RefreshCw className="w-4 h-4 text-emerald" />
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          data={personal}
          keyExtractor={(p) => p.id_personal}
          emptyMessage="No hay empleados"
        />
      </Card>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); }}
        title={editando ? 'Editar Empleado' : 'Nuevo Empleado'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setModalOpen(false); setEditando(null); }}>Cancelar</Button>
            <Button onClick={handleSubmit} isLoading={procesando}>{editando ? 'Guardar' : 'Crear'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre Completo *"
            value={form.nombre_completo}
            onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
          />
          <Input
            label="Apodo"
            value={form.apodo}
            onChange={(e) => setForm({ ...form, apodo: e.target.value })}
          />
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={!!editando}
          />
          <Input
            label="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-silver mb-2">Tipo *</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              disabled={!!editando}
              className="w-full px-4 py-2.5 bg-slate border border-graphite rounded-lg text-pearl focus:outline-none focus:border-gold disabled:opacity-50"
            >
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {!editando && (
            <Input
              label="Contraseña *"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
          <Input
            label="Comisión Propina %"
            type="number"
            value={form.porcentaje_comision_propina}
            onChange={(e) => setForm({ ...form, porcentaje_comision_propina: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
