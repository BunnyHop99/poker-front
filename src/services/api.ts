import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { TokenResponse, AuthUser, LoginCredentials } from '../types';

// ============================================================================
// CONFIGURACIÓN DE AXIOS
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// INTERCEPTORES
// ============================================================================

// Request interceptor - añade token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - maneja errores y refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si es 401 y no es retry, intentar refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post<TokenResponse>(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh falló, limpiar y redirigir a login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// SERVICIOS DE AUTENTICACIÓN
// ============================================================================

export const authService = {
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<TokenResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);

    return response.data;
  },

  async getCurrentUser(): Promise<AuthUser> {
    const response = await api.get<AuthUser>('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },
};

// ============================================================================
// SERVICIOS DE TURNOS
// ============================================================================

export const turnoService = {
  async getTurnoActivo() {
    const response = await api.get('/turnos/activo');
    return response.data;
  },

  async abrirTurno(notas?: string) {
    const response = await api.post('/turnos/abrir', { notas });
    return response.data;
  },

  async cerrarTurno(idTurno: number) {
    const response = await api.post(`/turnos/${idTurno}/cerrar`);
    return response.data;
  },

  async getEstadisticas(idTurno: number) {
    const response = await api.get(`/turnos/${idTurno}/estadisticas`);
    return response.data;
  },
};

// ============================================================================
// SERVICIOS DE DASHBOARD
// ============================================================================

export const dashboardService = {
  async getCompleto() {
    const response = await api.get('/dashboard/completo');
    return response.data;
  },

  async getTurno() {
    const response = await api.get('/dashboard/turno');
    return response.data;
  },

  async getFichas() {
    const response = await api.get('/dashboard/fichas');
    return response.data;
  },

  async getMesas() {
    const response = await api.get('/dashboard/mesas');
    return response.data;
  },

  async getCreditos() {
    const response = await api.get('/dashboard/creditos');
    return response.data;
  },
};

// ============================================================================
// SERVICIOS DE JUGADORES
// ============================================================================

export const jugadorService = {
  async getAll(params?: { activos?: boolean; vip?: boolean }) {
    const response = await api.get('/jugadores', { params });
    return response.data;
  },

  async buscar(q: string) {
    const response = await api.get('/jugadores/buscar', { params: { q } });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/jugadores/${id}`);
    return response.data;
  },

  async crear(data: any) {
    const response = await api.post('/jugadores', data);
    return response.data;
  },

  async getCreditos() {
    const response = await api.get('/jugadores/creditos');
    return response.data;
  },
};

// ============================================================================
// SERVICIOS DE FICHAS
// ============================================================================

export const fichasService = {
  async getInventario() {
    const response = await api.get('/fichas/inventario');
    return response.data;
  },

  async retiroBoveda(detalles: any[], motivo?: string) {
    const response = await api.post('/fichas/boveda/retiro', { detalles, motivo });
    return response.data;
  },

  async retiroEstandar() {
    const response = await api.post('/fichas/boveda/retiro-estandar', {});
    return response.data;
  },

  async checkAlertaCaja() {
    const response = await api.get('/fichas/alerta-caja');
    return response.data;
  },
};

// ============================================================================
// SERVICIOS DE MESAS
// ============================================================================

export const mesaService = {
  /** Todas las mesas (activas + inactivas) */
  async getAll() {
    const response = await api.get('/mesas');
    return response.data;
  },

  /** Solo mesas inactivas disponibles para reactivar */
  async getInactivas() {
    const response = await api.get('/mesas/inactivas');
    return response.data;
  },

  /** Crear nueva mesa (o reactivar si existe inactiva con ese número) */
  async crear(data: { numero_mesa: number; nombre?: string | null; capacidad?: number; tipo_juego?: string }) {
    const response = await api.post('/mesas', data);
    return response.data;
  },

  /** Actualizar campos de una mesa (nombre, capacidad, activa…) */
  async actualizar(idMesa: number, data: { nombre?: string | null; capacidad?: number; activa?: boolean }) {
    const response = await api.put(`/mesas/${idMesa}`, data);
    return response.data;
  },

  /** Eliminar mesa permanentemente */
  async eliminar(idMesa: number) {
    const response = await api.delete(`/mesas/${idMesa}`);
    return response.data;
  },

  async getSesionesActivas() {
    const response = await api.get('/mesas/sesiones/activas');
    return response.data;
  },

  async getSesionDetalle(idSesion: number) {
    const response = await api.get(`/mesas/sesiones/${idSesion}`);
    return response.data;
  },

  async iniciarSesion(idMesa: number, stakes?: string) {
    const response = await api.post('/mesas/sesiones/iniciar', { id_mesa: idMesa, stakes });
    return response.data;
  },

  async cerrarSesion(idSesion: number) {
    const response = await api.post(`/mesas/sesiones/${idSesion}/cerrar`);
    return response.data;
  },

  async sentarJugador(idSesion: number, data: { id_jugador: number; asiento?: number; fichas: { id_ficha: number; cantidad: number }[]; metodo_pago: string }) {
    const response = await api.post(`/mesas/sesiones/${idSesion}/sentar`, data);
    return response.data;
  },

  async recompraJugador(idSesion: number, idJugadorSesion: number, data: { fichas: { id_ficha: number; cantidad: number }[]; metodo_pago: string }) {
    const response = await api.post(`/mesas/sesiones/${idSesion}/jugador/${idJugadorSesion}/recompra`, data);
    return response.data;
  },

  async cashoutJugador(idSesion: number, idJugadorSesion: number, data: { fichas: { id_ficha: number; cantidad: number }[]; metodo_cobro: string }) {
    const response = await api.post(`/mesas/sesiones/${idSesion}/jugador/${idJugadorSesion}/cashout`, data);
    return response.data;
  },
};

export const fichasTurnoService = {
  async getFichasActivo() {
    const response = await api.get('/turnos/activo/fichas');
    return response.data;
  },
};

export const rakeService = {
  async registrar(data: { id_sesion: number; id_dealer: number; fichas: { id_ficha: number; cantidad: number }[]; notas?: string }) {
    const response = await api.post('/turnos/activo/rake', data);
    return response.data;
  },

  async getRakes() {
    const response = await api.get('/turnos/activo/rakes');
    return response.data;
  },

  async getDealers() {
    const response = await api.get('/turnos/activo/dealers');
    return response.data;
  },
};

export default api;