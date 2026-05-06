// CONFIGURAÇÃO SUPABASE (Substitua pelos seus dados)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

document.addEventListener('DOMContentLoaded', () => {
    const goalCards = document.querySelectorAll('.goal-card');
    const shiftCards = document.querySelectorAll('.shift-card');
    const dateSelector = document.getElementById('date-selector');
    const nameInput = document.getElementById('name');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    
    let selectedGoal = '';
    let selectedDate = '';
    let selectedShift = '';
    let existingBookings = [];

    // Initialize
    const init = async () => {
        if (supabase) {
            await fetchAllBookings();
        }
        generateDates();
    };

    // Fetch all bookings to check slots
    const fetchAllBookings = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('booking_date, shift');
            
            if (error) throw error;
            existingBookings = data || [];
            console.log('Agendamentos carregados:', existingBookings.length);
        } catch (err) {
            console.error('Erro ao buscar agendamentos:', err.message);
        }
    };

    // Check if a slot is full (max 2)
    const checkSlotAvailability = (date, shift) => {
        const count = existingBookings.filter(b => b.booking_date === date && b.shift === shift).length;
        return count < 2;
    };

    // Update shift cards UI based on availability
    const updateShiftUI = () => {
        if (!selectedDate) return;

        shiftCards.forEach(card => {
            const shift = card.getAttribute('data-shift');
            const isAvailable = checkSlotAvailability(selectedDate, shift);
            
            if (!isAvailable) {
                card.classList.add('disabled');
                card.style.opacity = '0.3';
                card.style.pointerEvents = 'none';
                if (card.querySelector('p')) card.querySelector('p').innerText = 'ESGOTADO';
            } else {
                card.classList.remove('disabled');
                card.style.opacity = '1';
                card.style.pointerEvents = 'all';
                const originalTime = shift === 'Manhã' ? '06:00 - 11:00' : shift === 'Tarde' ? '14:00 - 17:00' : '18:00 - 21:00';
                if (card.querySelector('p')) card.querySelector('p').innerText = originalTime;
            }
        });
    };

    // Generate Dates
    const generateDates = () => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const container = document.getElementById('date-selector');
        container.innerHTML = '';
        
        for (let i = 1; i <= 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            if (date.getDay() === 0) continue;

            const dayName = days[date.getDay()];
            const dayNum = date.getDate();
            const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            const dateString = `${dayName}, ${dayNum} de ${month}`;
            
            const card = document.createElement('div');
            card.className = 'date-card';
            card.setAttribute('data-date', dateString);
            card.innerHTML = `
                <span>${dayName}</span>
                <strong>${dayNum}</strong>
                <span>${month}</span>
            `;
            
            card.addEventListener('click', () => {
                document.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedDate = dateString;
                
                // Clear shift selection when date changes
                selectedShift = '';
                shiftCards.forEach(c => c.classList.remove('active'));
                
                updateShiftUI();
                scrollToNext('.shift-grid');
            });
            
            container.appendChild(card);
        }
    };

    // Goal Selection
    goalCards.forEach(card => {
        card.addEventListener('click', () => {
            goalCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedGoal = card.getAttribute('data-goal');
            scrollToNext('.exclusivity-msg');
        });
    });

    // Shift Selection
    shiftCards.forEach(card => {
        card.addEventListener('click', () => {
            shiftCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedShift = card.getAttribute('data-shift');
            nameInput.focus();
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    const scrollToNext = (selector) => {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Save to Supabase and Open WhatsApp
    whatsappBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        
        if (!selectedGoal || !selectedDate || !selectedShift || !name) {
            alert('Por favor, preencha todos os campos antes de reservar.');
            return;
        }

        whatsappBtn.innerText = 'PROCESSANDO...';
        whatsappBtn.disabled = true;

        try {
            // 1. Double check availability before saving
            if (supabase) {
                const { count, error: countError } = await supabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('booking_date', selectedDate)
                    .eq('shift', selectedShift);

                if (count >= 2) {
                    alert('Desculpe, este horário acabou de lotar. Por favor, escolha outro.');
                    await fetchAllBookings();
                    updateShiftUI();
                    whatsappBtn.innerText = 'RESERVAR MINHA VAGA AGORA';
                    whatsappBtn.disabled = false;
                    return;
                }

                // 2. Save Booking
                const { error: saveError } = await supabase
                    .from('bookings')
                    .insert([
                        { name, goal: selectedGoal, booking_date: selectedDate, shift: selectedShift }
                    ]);

                if (saveError) throw saveError;
            }

            // 3. Open WhatsApp
            const phoneNumber = '555192438029'; 
            const message = `Olá! Acabei de reservar minha aula experimental exclusiva no site.\n\n👤 *Nome:* ${name}\n🎯 *Objetivo:* ${selectedGoal}\n📅 *Data:* ${selectedDate}\n🕒 *Turno:* ${selectedShift}\n\n_Vaga reservada com sucesso!_`;
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
            
            whatsappBtn.innerText = 'RESERVA CONCLUÍDA!';
            
        } catch (err) {
            console.error('Erro:', err.message);
            alert('Ocorreu um erro ao processar sua reserva. Tente novamente.');
            whatsappBtn.innerText = 'RESERVAR MINHA VAGA AGORA';
            whatsappBtn.disabled = false;
        }
    });

    init();
});
