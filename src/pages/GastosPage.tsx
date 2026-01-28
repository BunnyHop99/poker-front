import { useEffect, useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { Button, Card, Input, Modal, Table, Badge, Alert } from '../components/ui';
import api from '../services/api';

interface Gasto {
  id_gasto: number;
  concepto: string;
  monto: number;
  categoria: string;
  created_at: string;
}

const CATEGORIAS = ['OPERACION', 'COMIDA', 'PROPINA_EXTERNA', 'MANTENIMIENTO', 'OTRO'];

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ concepto: '', monto: '', categoria: 'OPERACION' });
  const [procesando, setProcesando] = useState(false);
  const [totalGastos, setTotalGastos] = useState(0);

  const fetchGastos = async () => {
    try {
      const data = await api.get('/gastos/turno-actual');
      setGastos(data.data.gastos || []);
      setTotalGastos(data.data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGastos(); }, []);

  const handleCrear = async () => {
    if (!form.concepto || !form.monto) return;
    setProcesando(true);
    try {
      await api.post('/gastos', { concepto: form.concepto, monto: Number(form.monto), categoria: form.categoria });
      setModalOpen(false);
      setForm({ concepto: '', monto: '', categoria: 'OPERACION' });
      fetchGastos();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Error');
    } finally {
      setProcesando(false);
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-pearl">Gastos del Turno</h1><p className="text-silver">Registro de gastos operativos</p></div>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" />Nuevo Gasto</Button>
      </div>

      <Card className="bg-gradient-to-br from-ruby/20 to-ruby/5 border-ruby/30">
        <div className="flex items-center justify-between">
          <div><p className="text-silver">Total Gastos del Turno</p><p className="text-3xl font-bold text-ruby">{fmt(totalGastos)}</p></div>
          <Receipt className="w-12 h-12 text-ruby/50" />
        </div>
      </Card>

      <Card title="Gastos Registrados" noPadding>
        <Table
          columns={[
            { key: 'concepto', header: 'Concepto', render: (g) => <span className="text-pearl">{g.concepto}</span> },
            { key: 'categoria', header: 'Categoría', render: (g) => <Badge variant="default">{g.categoria}</Badge> },
            { key: 'monto', header: 'Monto', render: (g) => <span className="text-ruby font-medium">{fmt(g.monto)}</span> },
            { key: 'hora', header: 'Hora', render: (g) => new Date(g.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) },
          ]}
          data={gastos}
          keyExtractor={(g) => g.id_gasto}
          isLoading={loading}
          emptyMessage="No hay gastos registrados"
        />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Gasto" footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleCrear} isLoading={procesando}>Registrar</Button></>}>
        <div className="space-y-4">
          <Input label="Concepto *" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Descripción del gasto" />
          <Input label="Monto *" type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} placeholder="0.00" />
          <div>
            <label className="block text-sm font-medium text-silver mb-2">Categoría</label>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full px-4 py-2.5 bg-slate border border-graphite rounded-lg text-pearl focus:outline-none focus:border-gold">
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
