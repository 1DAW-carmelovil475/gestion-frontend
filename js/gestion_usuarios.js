// ============================================
// DATOS INICIALES Y ESTRUCTURAS DE DATOS
// ============================================

// Empresas con datos completos
let companies = [
    {
        id: 1,
        name: "Tech Solutions SL",
        cif: "B12345678",
        email: "info@techsolutions.com",
        phone: "912345678",
        address: "Calle Mayor 123, Madrid",
        status: "Activo",
        notes: "Cliente desde 2020. Buen pagador.",
        services: ["Cloud", "Soporte", "Seguridad"],
        contacts: [
            { name: "Juan García", phone: "612345678", email: "juan@techsolutions.com", role: "Director IT" },
            { name: "María López", phone: "654987321", email: "maria@techsolutions.com", role: "Gerente" }
        ],
        createdAt: "2020-03-15",
        activity: []
    },
    {
        id: 2,
        name: "Red Digital Madrid",
        cif: "B87654321",
        email: "contacto@reddigital.es",
        phone: "911223344",
        address: "Avenida Barcelona 45, Madrid",
        status: "En revisión",
        notes: "Pendiente renovación contrato",
        services: ["Hardware", "Redes"],
        contacts: [
            { name: "Carlos Ruiz", phone: "678123456", email: "carlos@reddigital.es", role: "Técnico" }
        ],
        createdAt: "2021-06-20",
        activity: []
    },
    {
        id: 3,
        name: "ServiData Pro",
        cif: "B45678912",
        email: "admin@servidata.com",
        phone: "933445566",
        address: "Plaza Catalonia 10, Barcelona",
        status: "Suspendido",
        notes: "Contrato suspendido por impago",
        services: ["Cloud", "Backup"],
        contacts: [
            { name: "Ana Martínez", phone: "666777888", email: "ana@servidata.com", role: "Administración" }
        ],
        createdAt: "2019-01-10",
        activity: []
    },
    {
        id: 4,
        name: "Global Tech Industries",
        cif: "B11223344",
        email: "it@globaltech.es",
        phone: "917889900",
        address: "Polígono Industrial Norte, Sevilla",
        status: "Activo",
        notes: "Gran empresa con múltiples sedes",
        services: ["Cloud", "Soporte", "Hardware", "Redes", "Seguridad"],
        contacts: [
            { name: "Pedro Sánchez", phone: "600111222", email: "pedro@globaltech.es", role: "CIO" },
            { name: "Laura Gómez", phone: "600333444", email: "laura@globaltech.es", role: "Responsable IT" },
            { name: "Miguel Torres", phone: "600555666", email: "miguel@globaltech.es", role: "Técnico Senior" }
        ],
        createdAt: "2018-09-05",
        activity: []
    }
];

// Contratos
let contracts = [
    { id: 1, companyId: 1, type: "Mantenimiento Integral", startDate: "2024-01-01", endDate: "2024-12-31", value: 2400, status: "Activo", notes: "Renovación anual" },
    { id: 2, companyId: 1, type: "Cloud Services", startDate: "2024-03-01", endDate: "2025-02-28", value: 1200, status: "Activo", notes: "" },
    { id: 3, companyId: 2, type: "Soporte Técnico", startDate: "2023-06-01", endDate: "2024-05-31", value: 1800, status: "Por vencer", notes: "En negociación" },
    { id: 4, companyId: 4, type: "Mantenimiento Integral", startDate: "2024-01-01", endDate: "2025-12-31", value: 6000, status: "Activo", notes: "Contrato multianual" },
    { id: 5, companyId: 4, type: "Seguridad", startDate: "2024-06-01", endDate: "2025-05-31", value: 1800, status: "Activo", notes: "" }
];

// Facturas
let invoices = [
    { id: 1, number: "FAC-2024-001", companyId: 1, date: "2024-01-15", dueDate: "2024-02-15", amount: 200, status: "Pagada" },
    { id: 2, number: "FAC-2024-002", companyId: 1, date: "2024-02-15", dueDate: "2024-03-15", amount: 200, status: "Pagada" },
    { id: 3, number: "FAC-2024-003", companyId: 1, date: "2024-03-15", dueDate: "2024-04-15", amount: 200, status: "Pendiente" },
    { id: 4, number: "FAC-2024-004", companyId: 2, date: "2024-01-10", dueDate: "2024-02-10", amount: 150, status: "Vencida" },
    { id: 5, number: "FAC-2024-005", companyId: 4, date: "2024-01-01", dueDate: "2024-02-01", amount: 500, status: "Pagada" },
    { id: 6, number: "FAC-2024-006", companyId: 4, date: "2024-02-01", dueDate: "2024-03-01", amount: 500, status: "Pagada" }
];

// Tickets de soporte
let tickets = [
    { id: 1, companyId: 1, subject: "No funciona el correo", description: "Los usuarios no pueden enviar emails", priority: "Alta", status: "Abierto", date: "2024-03-20" },
    { id: 2, companyId: 1, subject: "Solicitud de nuevo usuario", description: "Dar de alta a nuevo empleado", priority: "Baja", status: "Cerrado", date: "2024-03-18" },
    { id: 3, companyId: 4, subject: "Caída de servidor", description: "Servidor principal no responde", priority: "Urgente", status: "En proceso", date: "2024-03-22" },
    { id: 4, companyId: 2, subject: "Configuración VPN", description: "Necesitan configurar acceso remoto", priority: "Media", status: "Abierto", date: "2024-03-21" }
];

// Actividad reciente
let activities = [
    { type: "company", action: "create", description: "Empresa creada: Tech Solutions SL", date: "2020-03-15 10:30" },
    { type: "contract", action: "create", description: "Nuevo contrato: Mantenimiento Integral", date: "2024-01-01 09:00" },
    { type: "invoice", action: "create", description: "Factura FAC-2024-003 emitida", date: "2024-03-15 14:20" },
    { type: "ticket", action: "create", description: "Ticket #1 creado: No funciona el correo", date: "2024-03-20 11:45" }
];

// Variables de paginación
let currentPage = 1;
const itemsPerPage = 10;

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    renderCompanies();
    renderContracts();
    renderInvoices();
    renderTickets();
    updateStats();
    setupNavigation();
    setupFormTabs();
});

// ============================================
// NAVEGACIÓN ENTRE SECCIONES
// ============================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            
            // Actualizar navegación
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar sección
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
        });
    });
}

function setupFormTabs() {
    const formTabs = document.querySelectorAll('.form-tab');
    const formTabContents = document.querySelectorAll('.form-tab-content');
    
    formTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Actualizar tabs
            formTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar contenido correspondiente
            formTabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${targetTab}`) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// ============================================
// RENDERIZADO DE EMPRESAS
// ============================================

function renderCompanies() {
    const table = document.getElementById('companyTable');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const serviceFilter = document.getElementById('serviceFilter').value;
    
    let filtered = companies.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm) ||
                             c.cif.toLowerCase().includes(searchTerm) ||
                             c.email.toLowerCase().includes(searchTerm) ||
                             c.contacts.some(cont => cont.name.toLowerCase().includes(searchTerm));
        
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        
        const matchesService = serviceFilter === 'all' || c.services.includes(serviceFilter);
        
        return matchesSearch && matchesStatus && matchesService;
    });
    
    // Paginación
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    
    if (paginated.length === 0) {
        table.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--gray);">No se encontraron empresas</td></tr>`;
        return;
    }
    
    table.innerHTML = paginated.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.cif}</td>
            <td>${c.email}</td>
            <td>${c.phone}</td>
            <td>
                <div class="services-tags">
                    ${c.services.map(s => `<span class="service-tag">${s}</span>`).join('')}
                </div>
            </td>
            <td><span class="status ${c.status.replace(' ', '-')}">${c.status}</span></td>
            <td>
                <button class="btn-action btn-view" onclick="viewCompany(${c.id})" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action btn-edit" onclick="editCompany(${c.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteCompany(${c.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    renderPagination(totalPages);
    updateStats();
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderCompanies();
}

// ============================================
// RENDERIZADO DE CONTRATOS
// ============================================

function renderContracts() {
    const table = document.getElementById('contractsTable');
    
    table.innerHTML = contracts.map(contract => {
        const company = companies.find(c => c.id === contract.companyId);
        return `
            <tr>
                <td><strong>${company ? company.name : 'Desconocida'}</strong></td>
                <td>${contract.type}</td>
                <td>${formatDate(contract.startDate)}</td>
                <td>${formatDate(contract.endDate)}</td>
                <td><strong>${contract.value}€</strong></td>
                <td><span class="status ${contract.status.replace(' ', '-')}">${contract.status}</span></td>
                <td>
                    <button class="btn-action btn-view" onclick="viewContract(${contract.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editContract(${contract.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteContract(${contract.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    updateContractStats();
}

// ============================================
// RENDERIZADO DE FACTURAS
// ============================================

function renderInvoices() {
    const table = document.getElementById('invoicesTable');
    
    table.innerHTML = invoices.map(invoice => {
        const company = companies.find(c => c.id === invoice.companyId);
        return `
            <tr>
                <td><strong>${invoice.number}</strong></td>
                <td>${company ? company.name : 'Desconocida'}</td>
                <td>${formatDate(invoice.date)}</td>
                <td><strong>${invoice.amount.toFixed(2)}€</strong></td>
                <td><span class="status ${invoice.status}">${invoice.status}</span></td>
                <td>
                    <button class="btn-action btn-view" onclick="viewInvoice(${invoice.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editInvoice(${invoice.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteInvoice(${invoice.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    updateInvoiceStats();
}

// ============================================
// RENDERIZADO DE TICKETS
// ============================================

function renderTickets() {
    const table = document.getElementById('ticketsTable');
    
    table.innerHTML = tickets.map(ticket => {
        const company = companies.find(c => c.id === ticket.companyId);
        return `
            <tr>
                <td><strong>#${ticket.id}</strong></td>
                <td>${company ? company.name : 'Desconocida'}</td>
                <td>${ticket.subject}</td>
                <td><span class="status Prioridad-${ticket.priority}">${ticket.priority}</span></td>
                <td><span class="status ${ticket.status.replace(' ', '-')}">${ticket.status}</span></td>
                <td>${formatDate(ticket.date)}</td>
                <td>
                    <button class="btn-action btn-view" onclick="viewTicket(${ticket.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editTicket(${ticket.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteTicket(${ticket.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    updateTicketStats();
}

// ============================================
// ESTADÍSTICAS
// ============================================

function updateStats() {
    document.getElementById('totalEmpresas').innerText = companies.length;
    document.getElementById('empresasActivas').innerText = companies.filter(c => c.status === 'Activo').length;
}

function updateContractStats() {
    document.getElementById('totalContratos').innerText = contracts.length;
    document.getElementById('contratosActivos').innerText = contracts.filter(c => c.status === 'Activo').length;
    
    // Contratos por vencer en los próximos 30 días
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const porVencer = contracts.filter(c => {
        const endDate = new Date(c.endDate);
        return endDate <= thirtyDaysFromNow && c.status === 'Activo';
    }).length;
    document.getElementById('contratosPorVencer').innerText = porVencer;
    
    const totalValue = contracts.reduce((sum, c) => sum + c.value, 0);
    document.getElementById('facturacionTotal').innerText = totalValue.toLocaleString() + '€';
}

function updateInvoiceStats() {
    document.getElementById('totalFacturas').innerText = invoices.length;
    document.getElementById('facturasPagadas').innerText = invoices.filter(i => i.status === 'Pagada').length;
    document.getElementById('facturasPendientes').innerText = invoices.filter(i => i.status === 'Pendiente').length;
    document.getElementById('facturasVencidas').innerText = invoices.filter(i => i.status === 'Vencida').length;
}

function updateTicketStats() {
    document.getElementById('totalTickets').innerText = tickets.length;
    document.getElementById('ticketsAbiertos').innerText = tickets.filter(t => t.status === 'Abierto').length;
    document.getElementById('ticketsCerrados').innerText = tickets.filter(t => t.status === 'Cerrado').length;
    document.getElementById('ticketsUrgentes').innerText = tickets.filter(t => t.priority === 'Urgente' && t.status !== 'Cerrado').length;
}

// ============================================
// ALERTAS DE CONTRATOS
// ============================================

// Función deshabilitada - Las alertas no se mostrarán al cargar la página
/*
function checkContractAlerts() {
    const container = document.getElementById('alertsContainer');
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringContracts = contracts.filter(c => {
        const endDate = new Date(c.endDate);
        return endDate <= thirtyDaysFromNow && c.status === 'Activo';
    });
    
    if (expiringContracts.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    expiringContracts.forEach(contract => {
        const company = companies.find(c => c.id === contract.companyId);
        const daysLeft = Math.ceil((new Date(contract.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        
        html += `
            <div class="alert">
                <i class="fas fa-exclamation-triangle"></i>
                <div class="alert-content">
                    <div class="alert-title">Contrato próximo a vencer</div>
                    <div class="alert-desc">${company ? company.name : 'Empresa'} - ${contract.type} (${daysLeft} días restantes)</div>
                </div>
                <button class="alert-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}
*/

// ============================================
// MODAL DE EMPRESAS
// ============================================

function openCompanyModal(company = null) {
    const modal = document.getElementById('companyModal');
    const title = document.getElementById('companyModalTitle');
    const form = document.getElementById('companyForm');
    
    if (company) {
        title.innerText = 'Editar Empresa';
        document.getElementById('editCompanyIndex').value = company.id;
        document.getElementById('newName').value = company.name;
        document.getElementById('newCif').value = company.cif;
        document.getElementById('newEmail').value = company.email;
        document.getElementById('newPhone').value = company.phone;
        document.getElementById('newAddress').value = company.address || '';
        document.getElementById('newStatus').value = company.status;
        document.getElementById('newNotes').value = company.notes || '';
        
        // Servicios
        document.querySelectorAll('input[name="services"]').forEach(checkbox => {
            checkbox.checked = company.services.includes(checkbox.value);
        });
        
        // Contactos
        const contactsContainer = document.getElementById('contactsContainer');
        contactsContainer.innerHTML = '';
        company.contacts.forEach(contact => {
            addContactRow(contact);
        });
    } else {
        title.innerText = 'Nueva Empresa';
        form.reset();
        document.getElementById('editCompanyIndex').value = '';
        document.getElementById('contactsContainer').innerHTML = '';
        addContactRow();
        document.querySelectorAll('input[name="services"]').forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    
    modal.style.display = 'flex';
}

function closeCompanyModal() {
    document.getElementById('companyModal').style.display = 'none';
}

function saveCompany() {
    const id = document.getElementById('editCompanyIndex').value;
    const name = document.getElementById('newName').value.trim();
    const cif = document.getElementById('newCif').value.trim();
    const email = document.getElementById('newEmail').value.trim();
    const phone = document.getElementById('newPhone').value.trim();
    const address = document.getElementById('newAddress').value.trim();
    const status = document.getElementById('newStatus').value;
    const notes = document.getElementById('newNotes').value.trim();
    
    if (!name || !cif || !email) {
        showToast('error', 'Error', 'Por favor completa los campos obligatorios');
        return;
    }
    
    // Recoger servicios
    const services = [];
    document.querySelectorAll('input[name="services"]:checked').forEach(checkbox => {
        services.push(checkbox.value);
    });
    
    // Recoger contactos
    const contacts = [];
    document.querySelectorAll('.contact-row').forEach(row => {
        const name = row.querySelector('.contact-name').value.trim();
        const phone = row.querySelector('.contact-phone').value.trim();
        const email = row.querySelector('.contact-email').value.trim();
        const role = row.querySelector('.contact-role').value.trim();
        
        if (name) {
            contacts.push({ name, phone, email, role });
        }
    });
    
    if (id) {
        // Editar empresa existente
        const index = companies.findIndex(c => c.id === parseInt(id));
        if (index !== -1) {
            const oldCompany = companies[index];
            companies[index] = {
                ...oldCompany,
                name, cif, email, phone, address, status, notes, services, contacts
            };
            
            addActivity('company', 'update', `Empresa actualizada: ${name}`);
            showToast('success', 'Éxito', 'Empresa actualizada correctamente');
        }
    } else {
        // Nueva empresa
        const newCompany = {
            id: Date.now(),
            name, cif, email, phone, address, status, notes, services, contacts,
            createdAt: new Date().toISOString().split('T')[0],
            activity: []
        };
        companies.push(newCompany);
        
        addActivity('company', 'create', `Nueva empresa creada: ${name}`);
        showToast('success', 'Éxito', 'Empresa creada correctamente');
    }
    
    closeCompanyModal();
    renderCompanies();
}

// ============================================
// VER DETALLE DE EMPRESA
// ============================================

function viewCompany(id) {
    const company = companies.find(c => c.id === id);
    if (!company) return;
    
    document.getElementById('detailCompanyName').innerText = company.name;
    document.getElementById('detailCif').innerText = company.cif;
    document.getElementById('detailEmail').innerText = company.email;
    document.getElementById('detailPhone').innerText = company.phone;
    document.getElementById('detailAddress').innerText = company.address || 'No especificada';
    document.getElementById('detailStatus').innerText = company.status;
    document.getElementById('detailStatus').className = `status ${company.status.replace(' ', '-')}`;
    
    // Servicios
    document.getElementById('detailServices').innerHTML = company.services.length > 0 
        ? company.services.map(s => `<span class="service-tag">${s}</span>`).join('')
        : '<span style="color: var(--gray)">Sin servicios activos</span>';
    
    // Contactos
    document.getElementById('detailContacts').innerHTML = company.contacts.length > 0
        ? company.contacts.map(contact => `
            <div class="detail-contact">
                <div class="detail-contact-avatar">${contact.name.charAt(0)}</div>
                <div class="detail-contact-info">
                    <div class="detail-contact-name">${contact.name}</div>
                    <div class="detail-contact-role">${contact.role}</div>
                </div>
                <div class="detail-contact-contact">
                    ${contact.email}<br>${contact.phone}
                </div>
            </div>
        `).join('')
        : '<span style="color: var(--gray)">Sin contactos registrados</span>';
    
    // Contratos
    const companyContracts = contracts.filter(c => c.companyId === id);
    document.getElementById('detailContracts').innerHTML = companyContracts.length > 0
        ? companyContracts.map(contract => `
            <div class="detail-contract">
                <div class="detail-contract-info">
                    <div class="detail-contract-type">${contract.type}</div>
                    <div class="detail-contract-dates">${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}</div>
                </div>
                <span class="status ${contract.status.replace(' ', '-')}">${contract.status}</span>
            </div>
        `).join('')
        : '<span style="color: var(--gray)">Sin contratos activos</span>';
    
    // Actividad
    document.getElementById('detailActivity').innerHTML = company.activity && company.activity.length > 0
        ? company.activity.slice(0, 10).map(act => `
            <div class="detail-activity-item">
                <i class="fas fa-circle"></i>
                <span>${act.description}</span>
                <span class="detail-activity-time">${act.date}</span>
            </div>
        `).join('')
        : '<span style="color: var(--gray)">Sin actividad reciente</span>';
    
    document.getElementById('companyDetailModal').style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('companyDetailModal').style.display = 'none';
}

// ============================================
// EDITAR Y ELIMINAR EMPRESAS
// ============================================

function editCompany(id) {
    const company = companies.find(c => c.id === id);
    if (company) {
        openCompanyModal(company);
    }
}

function deleteCompany(id) {
    const company = companies.find(c => c.id === id);
    if (!company) return;
    
    if (confirm(`¿Estás seguro de que quieres eliminar la empresa "${company.name}"?`)) {
        companies = companies.filter(c => c.id !== id);
        addActivity('company', 'delete', `Empresa eliminada: ${company.name}`);
        showToast('success', 'Eliminado', 'Empresa eliminada correctamente');
        renderCompanies();
    }
}

// ============================================
// CONTACTOS
// ============================================

function addContactRow(contact = null) {
    const container = document.getElementById('contactsContainer');
    const row = document.createElement('div');
    row.className = 'contact-row';
    row.innerHTML = `
        <input type="text" placeholder="Nombre" class="contact-name" value="${contact ? contact.name : ''}">
        <input type="tel" placeholder="Teléfono" class="contact-phone" value="${contact ? contact.phone : ''}">
        <input type="email" placeholder="Email" class="contact-email" value="${contact ? contact.email : ''}">
        <input type="text" placeholder="Cargo" class="contact-role" value="${contact ? contact.role : ''}">
        <button type="button" class="btn-remove-contact" onclick="removeContactRow(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
}

function removeContactRow(button) {
    const row = button.parentElement;
    const container = row.parentElement;
    if (container.children.length > 1) {
        row.remove();
    } else {
        // Limpiar si es el último
        row.querySelectorAll('input').forEach(input => input.value = '');
    }
}

// ============================================
// CONTRATOS
// ============================================

function openContractModal() {
    // Llenar selector de empresas
    const select = document.getElementById('contractCompany');
    select.innerHTML = companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    // Fechas por defecto
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    document.getElementById('contractForm').reset();
    document.getElementById('contractStart').value = today;
    document.getElementById('contractEnd').value = nextYear.toISOString().split('T')[0];
    
    document.getElementById('contractModal').style.display = 'flex';
}

function closeContractModal() {
    document.getElementById('contractModal').style.display = 'none';
}

function saveContract() {
    const companyId = parseInt(document.getElementById('contractCompany').value);
    const type = document.getElementById('contractType').value;
    const startDate = document.getElementById('contractStart').value;
    const endDate = document.getElementById('contractEnd').value;
    const value = parseFloat(document.getElementById('contractValue').value);
    const notes = document.getElementById('contractNotes').value;
    
    if (!companyId || !type || !startDate || !endDate || !value) {
        showToast('error', 'Error', 'Por favor completa todos los campos obligatorios');
        return;
    }
    
    const company = companies.find(c => c.id === companyId);
    
    contracts.push({
        id: Date.now(),
        companyId, type, startDate, endDate, value,
        status: 'Activo',
        notes
    });
    
    addActivity('contract', 'create', `Nuevo contrato para ${company.name}: ${type}`);
    showToast('success', 'Éxito', 'Contrato creado correctamente');
    closeContractModal();
    renderContracts();
}

function viewContract(id) {
    showToast('info', 'Ver', 'Función de vista de contrato');
}

function editContract(id) {
    showToast('info', 'Editar', 'Función de edición de contrato');
}

function deleteContract(id) {
    if (confirm('¿Eliminar este contrato?')) {
        contracts = contracts.filter(c => c.id !== id);
        showToast('success', 'Eliminado', 'Contrato eliminado');
        renderContracts();
    }
}

// ============================================
// FACTURAS
// ============================================

function openInvoiceModal() {
    const select = document.getElementById('invoiceCompany');
    select.innerHTML = companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    const today = new Date().toISOString().split('T')[0];
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    
    document.getElementById('invoiceForm').reset();
    document.getElementById('invoiceDate').value = today;
    document.getElementById('invoiceDueDate').value = thirtyDays.toISOString().split('T')[0];
    
    document.getElementById('invoiceModal').style.display = 'flex';
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').style.display = 'none';
}

function saveInvoice() {
    const number = document.getElementById('invoiceNumber').value.trim();
    const companyId = parseInt(document.getElementById('invoiceCompany').value);
    const date = document.getElementById('invoiceDate').value;
    const dueDate = document.getElementById('invoiceDueDate').value;
    const amount = parseFloat(document.getElementById('invoiceAmount').value);
    const status = document.getElementById('invoiceStatus').value;
    
    if (!number || !companyId || !date || !dueDate || !amount) {
        showToast('error', 'Error', 'Por favor completa todos los campos obligatorios');
        return;
    }
    
    const company = companies.find(c => c.id === companyId);
    
    invoices.push({
        id: Date.now(),
        number, companyId, date, dueDate, amount, status
    });
    
    addActivity('invoice', 'create', `Factura ${number} creada para ${company.name}`);
    showToast('success', 'Éxito', 'Factura creada correctamente');
    closeInvoiceModal();
    renderInvoices();
}

function viewInvoice(id) {
    showToast('info', 'Ver', 'Función de vista de factura');
}

function editInvoice(id) {
    showToast('info', 'Editar', 'Función de edición de factura');
}

function deleteInvoice(id) {
    if (confirm('¿Eliminar esta factura?')) {
        invoices = invoices.filter(i => i.id !== id);
        showToast('success', 'Eliminado', 'Factura eliminada');
        renderInvoices();
    }
}

// ============================================
// TICKETS
// ============================================

function openTicketModal() {
    const select = document.getElementById('ticketCompany');
    select.innerHTML = companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    document.getElementById('ticketForm').reset();
    
    document.getElementById('ticketModal').style.display = 'flex';
}

function closeTicketModal() {
    document.getElementById('ticketModal').style.display = 'none';
}

function saveTicket() {
    const companyId = parseInt(document.getElementById('ticketCompany').value);
    const subject = document.getElementById('ticketSubject').value.trim();
    const description = document.getElementById('ticketDescription').value.trim();
    const priority = document.getElementById('ticketPriority').value;
    const status = document.getElementById('ticketStatus').value;
    const date = new Date().toISOString().split('T')[0];
    
    if (!companyId || !subject) {
        showToast('error', 'Error', 'Por favor completa los campos obligatorios');
        return;
    }
    
    const company = companies.find(c => c.id === companyId);
    
    tickets.push({
        id: Date.now(),
        companyId, subject, description, priority, status, date
    });
    
    addActivity('ticket', 'create', `Nuevo ticket para ${company.name}: ${subject}`);
    showToast('success', 'Éxito', 'Ticket creado correctamente');
    closeTicketModal();
    renderTickets();
}

function viewTicket(id) {
    showToast('info', 'Ver', 'Función de vista de ticket');
}

function editTicket(id) {
    showToast('info', 'Editar', 'Función de edición de ticket');
}

function deleteTicket(id) {
    if (confirm('¿Eliminar este ticket?')) {
        tickets = tickets.filter(t => t.id !== id);
        showToast('success', 'Eliminado', 'Ticket eliminado');
        renderTickets();
    }
}

// ============================================
// EXPORTAR A EXCEL
// ============================================

async function exportToExcel() {
    // Importar la librería SheetJS desde CDN
    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
            script.onload = resolve;
        });
    }
    
    // Preparar los datos
    const data = companies.map(c => ({
        'Nombre': c.name,
        'CIF': c.cif,
        'Email': c.email,
        'Teléfono': c.phone,
        'Dirección': c.address || '',
        'Estado': c.status,
        'Servicios': c.services.join(', '),
        'Fecha Creación': c.createdAt
    }));
    
    // Crear el libro de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Configurar el ancho de las columnas
    ws['!cols'] = [
        { wch: 30 }, // Nombre
        { wch: 15 }, // CIF
        { wch: 30 }, // Email
        { wch: 15 }, // Teléfono
        { wch: 40 }, // Dirección
        { wch: 15 }, // Estado
        { wch: 40 }, // Servicios
        { wch: 15 }  // Fecha Creación
    ];
    
    // Añadir la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    
    // Generar el nombre del archivo con fecha actual
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `empresas_${fecha}.xlsx`;
    
    // Descargar el archivo
    XLSX.writeFile(wb, nombreArchivo);
    
    showToast('success', 'Exportado', 'Datos exportados a Excel correctamente');
}

// ============================================
// ACTIVIDAD
// ============================================

function addActivity(type, action, description) {
    const activity = {
        type,
        action,
        description,
        date: new Date().toLocaleString()
    };
    activities.unshift(activity);
    
    // Mantener solo las últimas 50 actividades
    if (activities.length > 50) {
        activities = activities.slice(0, 50);
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'times-circle';
    if (type === 'warning') icon = 'exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto eliminar después de 5 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// ============================================
// FORMATO DE FECHAS
// ============================================

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ============================================
// EVENT LISTENERS ADICIONALES
// ============================================

document.getElementById('searchInput').addEventListener('input', renderCompanies);
document.getElementById('statusFilter').addEventListener('change', renderCompanies);
document.getElementById('serviceFilter').addEventListener('change', renderCompanies);

document.getElementById('addCompanyBtn').addEventListener('click', () => openCompanyModal());
document.getElementById('addContractBtn').addEventListener('click', () => openContractModal());
document.getElementById('addInvoiceBtn').addEventListener('click', () => openInvoiceModal());
document.getElementById('addTicketBtn').addEventListener('click', () => openTicketModal());

// Botón de cerrar sesión
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        showToast('success', 'Sesión cerrada', 'Hasta pronto');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
});

// Cerrar modales al hacer click fuera
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});