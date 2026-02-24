const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'https://TU_BACKEND_URL_AQUI'

export async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem('hola_token')

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  }

  if (options.body instanceof FormData) {
    delete config.headers['Content-Type']
  }

  let url
  if (path.startsWith('http')) {
    url = path
  } else {
    url = `${API_URL}${path}`
  }

  let res
  try {
    res = await fetch(url, config)
  } catch (networkError) {
    throw new Error(`Error de conexión con el servidor. ¿Está el backend corriendo en ${API_URL}?`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await res.text()
    console.error('El servidor devolvió HTML en vez de JSON:', text.substring(0, 200))
    throw new Error(`El servidor devolvió una respuesta inesperada (${res.status}). Comprueba que el backend esté corriendo en ${API_URL}`)
  }

  const data = await res.json()

  if (res.status === 401) {
    sessionStorage.clear()
    window.location.href = '/login'
    throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.')
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Error ${res.status}`)
  }

  return data
}

// Empresas
export async function getEmpresas() {
  return apiFetch('/api/empresas')
}

export async function createEmpresa(data) {
  return apiFetch('/api/empresas', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateEmpresa(id, data) {
  return apiFetch(`/api/empresas/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteEmpresa(id) {
  return apiFetch(`/api/empresas/${id}`, { method: 'DELETE' })
}

// Dispositivos
export async function getDispositivos(empresaId, categoria) {
  const params = new URLSearchParams()
  if (empresaId) params.set('empresa_id', empresaId)
  if (categoria) params.set('categoria', categoria)
  return apiFetch(`/api/dispositivos?${params}`)
}

export async function createDispositivo(data) {
  return apiFetch('/api/dispositivos', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateDispositivo(id, data) {
  return apiFetch(`/api/dispositivos/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteDispositivo(id) {
  return apiFetch(`/api/dispositivos/${id}`, { method: 'DELETE' })
}

// Tickets V2
export async function getTickets(params = {}) {
  const query = new URLSearchParams(params)
  return apiFetch(`/api/v2/tickets?${query}`)
}

export async function getTicket(id) {
  return apiFetch(`/api/v2/tickets/${id}`)
}

export async function createTicket(data) {
  return apiFetch('/api/v2/tickets', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateTicket(id, data) {
  return apiFetch(`/api/v2/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteTicket(id) {
  return apiFetch(`/api/v2/tickets/${id}`, { method: 'DELETE' })
}

export async function updateTicketNotas(id, notas) {
  return apiFetch(`/api/v2/tickets/${id}/notas`, { method: 'PUT', body: JSON.stringify({ notas }) })
}

export async function getTicketComentarios(ticketId) {
  return apiFetch(`/api/v2/tickets/${ticketId}/comentarios`)
}

export async function createTicketComentario(ticketId, contenido, files = []) {
  const formData = new FormData()
  formData.append('contenido', contenido)
  files.forEach(f => formData.append('files', f))
  
  const token = sessionStorage.getItem('hola_token')
  const res = await fetch(`${API_URL}/api/v2/tickets/${ticketId}/comentarios`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  })
  
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Error al crear comentario')
  }
  return res.json()
}

export async function deleteTicketComentario(comentarioId) {
  return apiFetch(`/api/v2/comentarios/${comentarioId}`, { method: 'DELETE' })
}

// Asignaciones
export async function assignOperarios(ticketId, operarios) {
  return apiFetch(`/api/v2/tickets/${ticketId}/asignaciones`, {
    method: 'POST',
    body: JSON.stringify({ operarios })
  })
}

export async function removeOperario(ticketId, userId) {
  return apiFetch(`/api/v2/tickets/${ticketId}/asignaciones/${userId}`, { method: 'DELETE' })
}

// Archivos
export async function getArchivoUrl(archivoId) {
  return apiFetch(`/api/v2/archivos/${archivoId}/url`)
}

export async function uploadTicketArchivo(ticketId, files) {
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  
  const token = sessionStorage.getItem('hola_token')
  const res = await fetch(`${API_URL}/api/v2/tickets/${ticketId}/archivos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  })
  
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Error al subir archivos')
  }
  return res.json()
}

export async function deleteArchivo(archivoId) {
  return apiFetch(`/api/v2/archivos/${archivoId}`, { method: 'DELETE' })
}

// Operarios
export async function getOperarios() {
  return apiFetch('/api/v2/operarios')
}

// Usuarios
export async function getUsuarios() {
  return apiFetch('/api/usuarios')
}

export async function createUsuario(data) {
  return apiFetch('/api/usuarios', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateUsuario(id, data) {
  return apiFetch(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteUsuario(id) {
  return apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' })
}

// Estadisticas
export async function getEstadisticasResumen() {
  return apiFetch('/api/v2/estadisticas/resumen')
}

export async function getEstadisticasOperarios(params = {}) {
  const query = new URLSearchParams(params)
  return apiFetch(`/api/v2/estadisticas/operarios?${query}`)
}

export async function getEstadisticasEmpresas(params = {}) {
  const query = new URLSearchParams(params)
  return apiFetch(`/api/v2/estadisticas/empresas?${query}`)
}

// Chat
export async function getChatCanales() {
  return apiFetch('/api/v2/chat/canales')
}

export async function createChatCanal(data) {
  return apiFetch('/api/v2/chat/canales', { method: 'POST', body: JSON.stringify(data) })
}

export async function deleteChatCanal(id) {
  return apiFetch(`/api/v2/chat/canales/${id}`, { method: 'DELETE' })
}

export async function getChatMensajes(canalId, limit = 100) {
  return apiFetch(`/api/v2/chat/canales/${canalId}/mensajes?limit=${limit}`)
}

export async function sendChatMensaje(canalId, contenido, ticketRefId = null, files = []) {
  const formData = new FormData()
  formData.append('contenido', contenido)
  if (ticketRefId) formData.append('ticket_ref_id', ticketRefId)
  files.forEach(f => formData.append('files', f))
  
  const token = sessionStorage.getItem('hola_token')
  const res = await fetch(`${API_URL}/api/v2/chat/canales/${canalId}/mensajes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  })
  
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Error al enviar mensaje')
  }
  return res.json()
}

export async function deleteChatMensaje(mensajeId) {
  return apiFetch(`/api/v2/chat/mensajes/${mensajeId}`, { method: 'DELETE' })
}

export async function addChatMiembros(canalId, miembros) {
  return apiFetch(`/api/v2/chat/canales/${canalId}/miembros`, {
    method: 'POST',
    body: JSON.stringify({ miembros })
  })
}

export { API_URL }
