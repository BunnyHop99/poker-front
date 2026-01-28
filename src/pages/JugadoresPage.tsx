import { useEffect, useState } from 'react';
import { Plus, Search, Star, AlertTriangle } from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Table } from '../components/ui';
import { jugadorService } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface Jugador {
  id_jugador: number;
  nombre_completo: string;
  apodo: string | null;
  whatsapp: string | null;
  limite_credito: number;
  saldo_credito: number;
  alerta_credito: number;
  vip: boolean;
  activo: boolean;
  ultima_visita: string | null;
}

export default function JugadoresPage() {
  const { isCajero } = useAuthStore();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroVip, setFiltroVip] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre_completo: '', apodo: '', whatsapp: '', limite_credito: 0 });

  const fetchJugadores = async () => {
    try {
      const data = await jugadorService.getAll(filtroVip ? { vip: true } : {});
      setJugadores(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const buscar = async () => {
    if (!searchTerm.trim()) return fetchJugadores();
    setLoading(true);
    try {
      const data = await jugadorService.buscar(searchTerm);
      setJugadores(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJugadores(); }, [filtroVip]);

  const handleCrear = async () => {
    try {
      await jugadorService.crear(form);
      setModalOpen(false);
      setForm({ nombre_completo: '', apodo: '', whatsapp: '', limite_credito: 0 });
      fetchJugadores();
    } catch (e: any) { alert(e.response?.data?.detail || 'Error'); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-pearl">Jugadores</h1><p className="text-silver">Gestión de jugadores y créditos</p></div>
        {isCajero() && <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" />Nuevo</Button>}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-silver" />
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscar()} className="w-full pl-10 pr-4 py-2.5 bg-slate border border-graphite rounded-lg text-pearl placeholder:text-silver/60 focus:outline-none focus:border-gold" />
          </div>
          <div className="flex gap-2">
            <Button variant={filtroVip ? 'primary' : 'secondary'} size="sm" onClick={() => setFiltroVip(!filtroVip)}><Star className="w-4 h-4" />VIP</Button>
            <Button variant="ghost" size="sm" onClick={buscar}>Buscar</Button>
          </div>
        </div>
      </Card>

      <Card noPadding>
        <Table
          columns={[
            { key: 'nombre', header: 'Jugador', render: (j) => (
              <div className="flex items-center gap-2">
                {j.vip && <Star className="w-4 h-4 text-gold fill-gold" />}
                <div><p className="font-medium text-pearl">{j.nombre_completo}</p>{j.apodo && <p className="text-sm text-silver">"{j.apodo}"</p>}</div>
              </div>
            )},
            { key: 'whatsapp', header: 'WhatsApp', render: (j) => j.whatsapp || '-' },
            { key: 'credito', header: 'Crédito', render: (j) => {
              if (j.limite_credito === 0) return <span className="text-silver">Sin línea</span>;
              const pct = (j.saldo_credito / j.limite_credito) * 100;
              return (
                <div>
                  <div className="flex items-center gap-2"><span className="text-pearl">{fmt(j.saldo_credito)}</span><span className="text-silver text-sm">/ {fmt(j.limite_credito)}</span>{pct >= j.alerta_credito && <AlertTriangle className="w-4 h-4 text-amber" />}</div>
                  <div className="w-full h-1.5 bg-graphite rounded-full mt-1"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-ruby' : pct >= j.alerta_credito ? 'bg-amber' : 'bg-emerald'}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                </div>
              );
            }},
            { key: 'ultima', header: 'Última Visita', render: (j) => j.ultima_visita ? new Date(j.ultima_visita).toLocaleDateString('es-MX') : 'Nunca' },
            { key: 'estado', header: 'Estado', render: (j) => j.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="error">Inactivo</Badge> },
          ]}
          data={jugadores}
          keyExtractor={(j) => j.id_jugador}
          isLoading={loading}
          emptyMessage="No hay jugadores"
        />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Jugador" footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleCrear}>Crear</Button></>}>
        <div className="space-y-4">
          <Input label="Nombre *" value={form.nombre_completo} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} />
          <Input label="Apodo" value={form.apodo} onChange={(e) => setForm({ ...form, apodo: e.target.value })} />
          <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <Input label="Límite Crédito" type="number" value={form.limite_credito} onChange={(e) => setForm({ ...form, limite_credito: Number(e.target.value) })} />
        </div>
      </Modal>
    </div>
  );
}
