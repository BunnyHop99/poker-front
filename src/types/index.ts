// ============================================================================
// TIPOS DE LA API
// ============================================================================

// Enums
export enum TipoPersonal {
  GERENTE = 'GERENTE',
  CAJERO = 'CAJERO',
  DEALER = 'DEALER',
  MESERO = 'MESERO',
  HOST = 'HOST',
}

export enum EstadoTurno {
  ABIERTO = 'ABIERTO',
  PAUSADO = 'PAUSADO',
  CERRADO = 'CERRADO',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  CREDITO = 'CREDITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum EstadoSesion {
  ACTIVA = 'ACTIVA',
  PAUSADA = 'PAUSADA',
  CERRADA = 'CERRADA',
}

// ============================================================================
// MODELOS
// ============================================================================

export interface Personal {
  id_personal: number;
  nombre_completo: string;
  apodo: string | null;
  email: string;
  tipo: TipoPersonal;
  activo: boolean;
  porcentaje_comision_propina: number;
  created_at: string;
}

export interface Turno {
  id_turno: number;
  id_gerente: number;
  fecha: string;
  hora_inicio: string;
  hora_cierre: string | null;
  estado: EstadoTurno;
  saldo_inicial_caja: number;
  notas: string | null;
  gerente?: Personal;
}

export interface Jugador {
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
  credito_disponible?: number;
  porcentaje_credito_usado?: number;
  en_alerta_credito?: boolean;
}

export interface Mesa {
  id_mesa: number;
  numero_mesa: number;
  nombre: string | null;
  capacidad: number;
  activa: boolean;
}

export interface Ficha {
  id_ficha: number;
  denominacion: number;
  color: string;
  cantidad_total: number;
  cantidad_boveda: number;
  cantidad_caja: number;
  cantidad_circulacion: number;
  valor_total: number;
  valor_boveda: number;
  valor_caja: number;
  valor_circulacion: number;
}

// ============================================================================
// AUTENTICACIÓN
// ============================================================================

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthUser {
  id_personal: number;
  nombre_completo: string;
  apodo: string | null;
  email: string;
  tipo: TipoPersonal;
}

// ============================================================================
// DASHBOARD
// ============================================================================

export interface DashboardTurno {
  turno_activo: boolean;
  id_turno: number | null;
  fecha: string | null;
  hora_inicio: string | null;
  gerente: string | null;
  horas_operacion: number | null;
  total_ventas: number;
  total_cobros: number;
  total_rake: number;
  total_propinas: number;
  total_gastos: number;
  ganancia_estimada: number;
  mesas_activas: number;
  max_mesas: number;
  jugadores_actuales: number;
}

export interface DashboardFichas {
  total_fichas: number;
  valor_total: number;
  valor_boveda: number;
  valor_caja: number;
  valor_circulacion: number;
  porcentaje_caja: number;
  alerta_caja_baja: boolean;
  fichas: Ficha[];
}

export interface DashboardCompleto {
  turno: DashboardTurno;
  fichas: DashboardFichas;
  mesas: any;
  creditos: any;
  personal: any;
  notificaciones_pendientes: number;
  ultima_actualizacion: string;
}

// ============================================================================
// RESPUESTAS API
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  detail: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
