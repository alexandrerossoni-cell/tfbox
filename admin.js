const SUPABASE_URL = 'https://xbrvbsiatwxcmnssaxwe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CWvQLBuFfWih-VxxqZT9XQ_lg6zARGR';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASSWORD = 'tfbox2026'; // Senha padrão

// Elementos
const loginOverlay = document.getElementById('login-overlay');
const adminPanel = document.getElementById('admin-panel');
const passwordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const bookingsBody = document.getElementById('bookings-body');
const refreshBtn = document.getElementById('refresh-btn');

const totalCountEl = document.getElementById('total-bookings');
const todayCountEl = document.getElementById('today-bookings');

// Autenticação simples
loginBtn.addEventListener('click', () => {
    if (passwordInput.value === ADMIN_PASSWORD) {
        loginOverlay.style.display = 'none';
        adminPanel.style.display = 'block';
        localStorage.setItem('tfbox_admin', 'true');
        fetchBookings();
    } else {
        loginError.style.display = 'block';
    }
});

// Check session
if (localStorage.getItem('tfbox_admin') === 'true') {
    loginOverlay.style.display = 'none';
    adminPanel.style.display = 'block';
    fetchBookings();
}

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('tfbox_admin');
    window.location.reload();
});

// Atualização manual via botões onclick no HTML

async function fetchBookings() {
    console.log('Iniciando busca de reservas...');
    try {
        const { data, error } = await supabaseClient
            .from('bookings')
            .select('*');

        if (error) {
            console.error('Erro detalhado do Supabase:', error);
            throw error;
        }

        console.log('Dados recebidos:', data);
        renderBookings(data || []);
    } catch (err) {
        console.error('Erro na função fetchBookings:', err.message);
        alert('Erro ao carregar dados: ' + err.message);
    }
}

function renderBookings(bookings) {
    bookingsBody.innerHTML = '';
    
    // Atualizar Stats
    totalCountEl.innerText = bookings.length;
    const today = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
    const todayBookings = bookings.filter(b => b.booking_date.includes(today)).length;
    todayCountEl.innerText = todayBookings;

    bookings.forEach(b => {
        const row = document.createElement('tr');
        const phoneDisplay = b.phone || 'N/A';
        const phoneLink = b.phone ? `https://wa.me/${b.phone.replace(/\D/g,'')}` : '#';
        
        row.innerHTML = `
            <td data-label="Data"><strong>${b.booking_date}</strong></td>
            <td data-label="Horário">${b.shift}</td>
            <td data-label="Nome">${b.name}</td>
            <td data-label="WhatsApp"><a href="${phoneLink}" target="_blank" class="whatsapp-link">${phoneDisplay}</a></td>
            <td data-label="Objetivo"><span class="goal-tag">${b.goal}</span></td>
            <td data-label="Dispositivo"><small>${b.device || '-'}</small></td>
            <td>
                <button class="delete-btn" onclick="deleteBooking('${b.id}')">Excluir Registro</button>
            </td>
        `;
        bookingsBody.appendChild(row);
    });
}

async function deleteBooking(id) {
    if (!confirm('Tem certeza que deseja excluir esta reserva?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('bookings')
            .delete()
            .eq('id', id);

        if (error) throw error;
        fetchBookings();
    } catch (err) {
        alert('Erro ao excluir: ' + err.message);
    }
}

// Tornar global para o onclick
window.fetchBookings = fetchBookings;
window.deleteBooking = deleteBooking;
