const TOKEN_KEY = 'smartlogix_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("smartlogix:unauthorized"));
}

export function decodeTokenPayload() {
  const token = getToken();
  if (!token) return null;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error decodificando el token", e);
    return null;
  }
}

export function isTokenExpired() {
  const payload = decodeTokenPayload();
  if (!payload || !payload.exp) return true;
  return (Date.now() / 1000) > payload.exp;
}

// URL ajustada al Balanceador de Carga de AWS (API Gateway)
const API_GATEWAY_URL = 'http://a656ac224048247fea9c6268aeb2bd00-1393924712.us-east-1.elb.amazonaws.com:8080';

async function fetchWithAuth(endpoint, options = {}) {
  const token = getToken();
  
  if (token && isTokenExpired()) {
    logout();
    throw new Error("Sesión expirada. Inicia sesión nuevamente.");
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_GATEWAY_URL}${endpoint}`, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
      logout();
      throw new Error("Acceso denegado o token inválido");
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Error del servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error en fetchWithAuth [${endpoint}]:`, error);
    throw error;
  }
}

// Pedidos
export async function getPedidos() {
  try { return await fetchWithAuth('/api/pedidos'); } catch { return []; }
}

export async function getDetallePedido(id) {
  return await fetchWithAuth(`/api/pedidos/${id}`);
}

export async function compensarPedido(id) {
  return await fetchWithAuth(`/api/pedidos/${id}/compensar`, { method: 'PUT' });
}

export async function completarPedido(id) {
  return await fetchWithAuth(`/api/pedidos/${id}/completar`, { method: 'PUT' });
}

// Dashboard / BFF
export async function getDashboardKPIs() {
  return await fetchWithAuth('/api/bff/kpis');
}

export async function getDashboard() {
  return await fetchWithAuth('/api/bff/dashboard');
}

// Inventario - Productos
export async function getProductos() {
  try { return await fetchWithAuth('/api/productos'); } catch { return []; }
}

export async function crearProducto(data) {
  return await fetchWithAuth('/api/productos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Inventario - Stocks
export async function getStocks() {
  try { return await fetchWithAuth('/api/stocks'); } catch { return []; }
}

export async function entradaStock(productoId, bodegaId, cantidad) {
  return await fetchWithAuth(`/api/stocks/entrada?productoId=${productoId}&bodegaId=${bodegaId}&cantidad=${cantidad}`, {
    method: 'POST',
  });
}

export async function salidaStock(productoId, bodegaId, cantidad) {
  return await fetchWithAuth(`/api/stocks/salida?productoId=${productoId}&bodegaId=${bodegaId}&cantidad=${cantidad}`, {
    method: 'POST',
  });
}

// Envíos
export async function getEnvioByPedidoId(pedidoId) {
  try { return await fetchWithAuth(`/api/envios/pedido/${pedidoId}`); } catch { return null; }
}

export async function crearEnvio(pedidoId, direccion) {
  return await fetchWithAuth(`/api/envios/pedido/${pedidoId}?direccion=${encodeURIComponent(direccion)}`, {
    method: 'POST',
  });
}

export async function actualizarEstadoEnvio(id, estado, transportista) {
  const params = new URLSearchParams({ estado });
  if (transportista) params.append('transportista', transportista);
  return await fetchWithAuth(`/api/envios/${id}/estado?${params.toString()}`, {
    method: 'PUT',
  });
}

// ── BFF Facade ────────────────────────────────────────────

function mapKpis(kpisData) {
  return [
    { id: 1, label: "Total Pedidos", value: kpisData.totalPedidos ?? 0, delta: null, trend: null, color: "blue" },
    { id: 2, label: "Ingresos", value: `$${kpisData.ingresos ?? 0}`, delta: null, trend: null, color: "emerald" },
    { id: 3, label: "Entregados", value: kpisData.entregados ?? 0, delta: null, trend: null, color: "violet" },
    { id: 4, label: "Pendientes", value: kpisData.pendientes ?? 0, delta: null, trend: null, color: "amber" },
  ];
}

export const bffFacade = {
  getDashboardData: async () => {
    const dashboard = await getDashboard();
    return {
      kpis: mapKpis(dashboard.kpis ?? {}),
      recentOrders: dashboard.recentOrders ?? [],
      stockAlerts: dashboard.stockAlerts ?? [],
      activityFeed: dashboard.activityFeed ?? [],
    };
  },
};