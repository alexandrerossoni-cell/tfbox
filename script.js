// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = 'https://xbrvbsiatwxcmnssaxwe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CWvQLBuFfWih-VxxqZT9XQ_lg6zARGR';

document.addEventListener('DOMContentLoaded', () => {
    const goalCards = document.querySelectorAll('.goal-card');
    const timeGrid = document.getElementById('time-grid');
    const nameInput = document.getElementById('name');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const dateSelector = document.getElementById('date-selector');
    
    let selectedGoal = '';
    let selectedDate = '';
    let selectedDayIndex = -1;
    let selectedTime = '';
    let selectedProfessor = '';
    let existingBookings = [];

    let supabase = null;
    const isSupabaseConfigured = SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith('YOUR_');

    if (window.supabase && isSupabaseConfigured) {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (e) { console.error(e); }
    }

    const schedule = {
        morning: [
            { time: '06:15', professor: 'Prof. João', days: [1, 2, 3, 5] },
            { time: '08:15', professor: 'Prof. Alexandre', days: [1, 2, 3, 5] }
        ],
        afternoon: [
            { time: '16:30', professor: 'Prof. Bruno', days: [1, 2, 3, 4, 5] },
            { time: '17:15', professor: 'Prof. Bruno', days: [1, 2, 3, 4, 5] },
            { time: '18:00', professor: 'Prof. Bruno', days: [1, 2, 3, 4, 5] },
            { time: '18:45', professor: 'Prof. Bruno', days: [1, 2, 3, 4, 5] },
            { time: '19:30', professor: 'Prof. Bruno', days: [1, 2, 3, 4, 5] }
        ]
    };

    const scrollToNext = (selector) => {
        const element = document.querySelector(selector);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // 1. GERAÇÃO DE DATAS (MÊS INTEIRO)
    const generateDates = () => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        if (!dateSelector) return;
        dateSelector.innerHTML = '';
        
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        
        for (let i = now.getDate() + 1; i <= lastDay; i++) {
            const date = new Date(year, month, i);
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const dayName = days[date.getDay()];
            const dayNum = date.getDate();
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            const dateString = `${dayName}, ${dayNum} de ${monthName}`;
            
            const card = document.createElement('div');
            card.className = 'date-card';
            card.id = `date-${dayNum}`;
            card.innerHTML = `
                <span>${dayName}</span>
                <strong>${dayNum}</strong>
                <span class="vagas-badge">Calculando...</span>
            `;
            
            card.addEventListener('click', () => {
                document.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedDate = dateString;
                selectedDayIndex = date.getDay();
                selectedTime = '';
                updateTimeUI();
                scrollToNext('#time-grid');
            });
            
            dateSelector.appendChild(card);
        }
    };

    const updateDateAvailabilityUI = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();

        for (let i = now.getDate() + 1; i <= lastDay; i++) {
            const date = new Date(year, month, i);
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            const dateString = `${dayName}, ${i} de ${monthName}`;
            
            const totalSlots = [...schedule.morning, ...schedule.afternoon].filter(s => s.days.includes(date.getDay())).length * 2;
            const takenSlots = existingBookings.filter(b => b.booking_date === dateString).length;
            const available = totalSlots - takenSlots;

            const badge = document.querySelector(`#date-${i} .vagas-badge`);
            if (badge) {
                badge.innerText = available > 0 ? `${available} vagas` : 'LOTADO';
                if (available === 0) badge.style.color = '#ff4444';
                else badge.style.color = 'var(--accent-color)';
            }
        }
    };

    const updateTimeUI = () => {
        if (selectedDayIndex === -1 || !timeGrid) return;
        timeGrid.innerHTML = '';
        const availableSlots = [];
        [...schedule.morning, ...schedule.afternoon].forEach(slot => {
            if (slot.days.includes(selectedDayIndex)) availableSlots.push(slot);
        });

        availableSlots.forEach(slot => {
            const isAvailable = checkSlotAvailability(selectedDate, slot.time);
            const card = document.createElement('div');
            card.className = `time-card ${!isAvailable ? 'disabled' : ''}`;
            if (!isAvailable) {
                card.style.opacity = '0.3';
                card.style.pointerEvents = 'none';
            }
            card.innerHTML = `<h4>${slot.time}</h4><span class="professor">${!isAvailable ? 'ESGOTADO' : slot.professor}</span>`;
            card.addEventListener('click', () => {
                if (!isAvailable) return;
                document.querySelectorAll('.time-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedTime = slot.time;
                selectedProfessor = slot.professor;
                nameInput.focus();
                nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
            timeGrid.appendChild(card);
        });
    };

    const checkSlotAvailability = (date, time) => {
        if (!supabase) return true;
        return existingBookings.filter(b => b.booking_date === date && b.shift === time).length < 2;
    };

    const fetchAllBookings = async () => {
        if (!supabase) {
            updateDateAvailabilityUI();
            return;
        }
        try {
            const { data, error } = await supabase.from('bookings').select('booking_date, shift');
            if (error) throw error;
            existingBookings = data || [];
            updateDateAvailabilityUI();
        } catch (err) { console.error(err.message); updateDateAvailabilityUI(); }
    };

    goalCards.forEach(card => {
        card.addEventListener('click', () => {
            goalCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedGoal = card.getAttribute('data-goal');
            scrollToNext('.exclusivity-msg');
        });
    });

    whatsappBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        if (!selectedGoal || !selectedDate || !selectedTime || !name) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        whatsappBtn.innerText = 'PROCESSANDO...';
        whatsappBtn.disabled = true;
        try {
            if (supabase) {
                const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
                    .eq('booking_date', selectedDate).eq('shift', selectedTime);
                if (count >= 2) {
                    alert('Horário lotado!');
                    await fetchAllBookings();
                    return;
                }
                await supabase.from('bookings').insert([{ name, goal: selectedGoal, booking_date: selectedDate, shift: selectedTime }]);
            }
            window.open(`https://wa.me/555192438029?text=${encodeURIComponent(`Olá! Agendei meu treino.\n\n👤 *Nome:* ${name}\n🎯 *Objetivo:* ${selectedGoal}\n📅 *Data:* ${selectedDate}\n🕒 *Horário:* ${selectedTime} (${selectedProfessor})`)}`, '_blank');
            whatsappBtn.innerText = 'RESERVA CONCLUÍDA!';
        } catch (err) { alert('Erro no agendamento.'); whatsappBtn.innerText = 'RESERVAR MINHA VAGA AGORA'; whatsappBtn.disabled = false; }
    });

    generateDates();
    fetchAllBookings();
});
