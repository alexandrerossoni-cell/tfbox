// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = 'https://xbrvbsiatwxcmnssaxwe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CWvQLBuFfWih-VxxqZT9XQ_lg6zARGR';

document.addEventListener('DOMContentLoaded', () => {
    // Containers
    const landingPage = document.getElementById('landing-page');
    const bookingApp = document.getElementById('booking-app');
    
    // Booking Elements
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const dateSelector = document.getElementById('date-selector');
    const timeGrid = document.getElementById('time-grid');
    const appProgressBar = document.getElementById('app-progress-bar');

    // State
    let selectedGoal = '';
    let selectedDate = '';
    let selectedDayIndex = -1;
    let selectedTime = '';
    let selectedProfessor = '';
    let existingBookings = [];
    let supabase = null;

    // Schedule
    const schedule = {
        morning: [
            { time: '06:15', professor: 'Prof. João', days: [1, 2, 3, 5] },
            { time: '08:15', professor: 'Prof. Alexandre', days: [1, 2, 5] },
            { time: '08:15', professor: 'Prof. João', days: [3] }
        ],
        afternoon: [
            { time: '16:30', professor: 'Prof. Bruno', days: [1, 2, 3, 4, 5] },
            { time: '17:15', professor: 'Prof. Bruno', days: [1, 2, 3, 4, 5] },
            { time: '18:00', professor: 'Prof. Bruno', days: [1, 2, 3, 4, 5] },
            { time: '18:45', professor: 'Prof. Bruno', days: [1, 2, 3, 4, 5] },
            { time: '19:30', professor: 'Prof. Bruno', days: [1, 2, 3, 4, 5] }
        ]
    };

    // Initialize Supabase
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // --- NAVIGATION LOGIC ---
    const showStep = (stepId) => {
        // Ocultar todos os passos
        document.querySelectorAll('.step-content').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });

        // Mostrar o passo atual
        const nextStep = document.getElementById(`step-${stepId}`);
        if (nextStep) {
            nextStep.classList.add('active');
            nextStep.style.display = 'block';
            
            // Garantir scroll para o topo do container do app
            const appContainer = document.querySelector('.app-container');
            if (appContainer) appContainer.scrollTop = 0;
        }

        // Atualizar Barra de Progresso e Label de Passo
        const steps = ['objetivo', 'data', 'hora', 'dados', 'sucesso'];
        const idx = steps.indexOf(stepId);
        
        const label = document.getElementById('current-step-label');
        const quickInfo = document.querySelector('.app-quick-info');

        if (idx !== -1) {
            if (label) label.innerText = `Passo ${idx + 1} de 4`;
            
            // Ocultar contador e info na tela de sucesso
            if (stepId === 'sucesso') {
                if (label) label.parentElement.style.display = 'none';
                if (quickInfo) quickInfo.style.display = 'none';
            } else {
                if (label) label.parentElement.style.display = 'block';
                if (quickInfo) quickInfo.style.display = 'block';
            }

            if (appProgressBar) {
                const progress = ((idx + 1) / steps.length) * 100;
                appProgressBar.style.width = `${progress}%`;
            }
        }

        logEvent('booking_step', stepId);
    };

    // --- MODES TOGGLE ---
    const openBooking = () => {
        landingPage.style.display = 'none';
        bookingApp.style.display = 'flex';
        document.body.classList.add('booking-mode');
        
        // Resetar para o primeiro passo
        showStep('objetivo');
        
        // Atualizar dados de ocupação sempre que abrir
        fetchAllBookings();
        
        logEvent('open_booking');
    };

    const closeBooking = () => {
        bookingApp.style.display = 'none';
        landingPage.style.display = 'block';
        document.body.classList.remove('booking-mode');
        logEvent('close_booking');
    };

    // Event Listeners para abertura/fechamento
    document.querySelectorAll('.btn-open-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openBooking();
        });
    });

    const closeBtn = document.getElementById('btn-close-booking');
    if (closeBtn) closeBtn.addEventListener('click', closeBooking);

    // Delegar cliques para os botões de "Voltar"
    document.addEventListener('click', (e) => {
        const backBtn = e.target.closest('.app-back-btn');
        if (backBtn) {
            const target = backBtn.getAttribute('data-to');
            showStep(target);
        }
    });

    // --- SELEÇÃO DE OBJETIVO ---
    // Usando delegação para garantir que funcione sempre
    document.addEventListener('click', (e) => {
        const goalCard = e.target.closest('.goal-card');
        if (goalCard) {
            document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('active'));
            goalCard.classList.add('active');
            selectedGoal = goalCard.getAttribute('data-goal');
            logEvent('goal_select', selectedGoal);
            
            // Transição automática para data
            setTimeout(() => showStep('data'), 400);
        }
    });

    // --- GERAÇÃO DE DATAS ---
    const generateDates = () => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        if (!dateSelector) return;
        dateSelector.innerHTML = '';
        
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        
        for (let i = now.getDate(); i <= lastDay; i++) {
            const date = new Date(year, month, i);
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            // Validação de hoje: não mostrar se já passou do último horário
            if (i === now.getDate()) {
                const lastSlot = '19:30';
                const [lH, lM] = lastSlot.split(':').map(Number);
                if (now.getHours() > lH || (now.getHours() === lH && now.getMinutes() > lM)) continue;
            }

            const dayName = days[date.getDay()];
            const dayNum = date.getDate();
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            const dateString = `${dayName}, ${dayNum} de ${monthName}`;
            
            const card = document.createElement('div');
            card.className = 'date-card';
            card.setAttribute('data-date', dateString);
            card.setAttribute('data-day-index', date.getDay());
            card.innerHTML = `
                <span>${dayName}</span>
                <strong>${dayNum}</strong>
                <div class="month-label">${monthName}</div>
            `;
            
            card.addEventListener('click', () => {
                document.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedDate = dateString;
                selectedDayIndex = date.getDay();
                updateTimeUI();
                logEvent('date_select', dateString);
                setTimeout(() => showStep('hora'), 400);
            });
            dateSelector.appendChild(card);
        }
    };

    // --- SELEÇÃO DE HORÁRIO ---
    const updateTimeUI = () => {
        if (selectedDayIndex === -1 || !timeGrid) return;
        timeGrid.innerHTML = '';
        const now = new Date();
        const allSlots = [...schedule.morning, ...schedule.afternoon];

        allSlots.forEach(slot => {
            if (slot.days.includes(selectedDayIndex)) {
                // Lógica de hoje: não mostrar horários que já passaram ou estão muito próximos
                if (selectedDate.includes(now.getDate().toString())) {
                    const [sH, sM] = slot.time.split(':').map(Number);
                    if (now.getHours() > sH || (now.getHours() === sH && now.getMinutes() > sM - 15)) return;
                }

                const vagas = getSlotVagas(selectedDate, slot.time);
                const isAvailable = vagas > 0;

                const card = document.createElement('div');
                card.className = `time-card ${!isAvailable ? 'disabled' : ''}`;
                card.innerHTML = `<h4>${slot.time}</h4><span>${slot.professor}</span>`;

                if (isAvailable) {
                    card.addEventListener('click', () => {
                        document.querySelectorAll('.time-card').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        selectedTime = slot.time;
                        selectedProfessor = slot.professor;
                        logEvent('time_select', slot.time);
                        setTimeout(() => showStep('dados'), 400);
                    });
                } else {
                    card.style.opacity = '0.3';
                    card.style.pointerEvents = 'none';
                }
                timeGrid.appendChild(card);
            }
        });
    };

    const getSlotVagas = (date, time) => {
        const bookings = existingBookings.filter(b => b.booking_date === date && b.shift === time);
        return Math.max(0, 2 - bookings.length);
    };

    // --- ENVIO DO FORMULÁRIO ---
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();

            if (!name) { nameInput.classList.add('error'); nameInput.focus(); return; }
            if (phone.length < 14) { phoneInput.classList.add('error'); phoneInput.focus(); return; }

            whatsappBtn.innerText = 'PROCESSANDO...';
            whatsappBtn.disabled = true;

            try {
                if (supabase) {
                    // Verificar duplicado
                    const { data: dup } = await supabase.from('bookings').select('id').eq('phone', phone).limit(1);
                    if (dup && dup.length > 0) {
                        alert('Você já possui uma aula agendada para este número!');
                        whatsappBtn.innerText = 'RESERVAR MINHA VAGA';
                        whatsappBtn.disabled = false;
                        return;
                    }

                    // Inserir no banco
                    const { error } = await supabase.from('bookings').insert([{ 
                        name, phone, goal: selectedGoal, booking_date: selectedDate, shift: selectedTime, device: getDeviceInfo() 
                    }]);
                    if (error) throw error;
                }

                // Gerar link do WhatsApp
                const message = `🔥 *NOVO AGENDAMENTO - TFBOX* 🔥\n\nOlá! Acabei de agendar minha aula experimental pelo site:\n\n👤 *NOME:* ${name}\n📱 *CONTATO:* ${phone}\n🎯 *FOCO:* ${selectedGoal}\n📅 *DATA:* ${selectedDate}\n🕒 *HORÁRIO:* ${selectedTime}\n👨‍🏫 *PROFESSOR:* ${selectedProfessor}\n\nAguardo a confirmação! 🚀`;
                const finalLink = document.getElementById('final-whatsapp-link');
                if (finalLink) finalLink.href = `https://wa.me/555192438029?text=${encodeURIComponent(message)}`;
                
                showStep('sucesso');
                if (window.fbq) fbq('track', 'Lead', { content_name: selectedGoal });
                logEvent('booking_complete');

            } catch (err) {
                console.error('Erro no agendamento:', err);
                alert('Ocorreu um erro ao salvar seu agendamento. Por favor, tente novamente.');
                whatsappBtn.innerText = 'RESERVAR MINHA VAGA';
                whatsappBtn.disabled = false;
            }
        });
    }

    // --- UTILITÁRIOS E RASTREIO ---
    const sessionId = Math.random().toString(36).substring(7);
    const getDeviceInfo = () => {
        const ua = navigator.userAgent;
        if (/iPhone|iPad|iPod/.test(ua)) return "iPhone";
        if (/Android/.test(ua)) return "Android";
        return "Desktop";
    };

    const logEvent = async (type, data = '') => {
        if (!supabase) return;
        try {
            await supabase.from('visitor_logs').insert([{
                session_id: sessionId,
                event_type: type,
                event_data: data,
                device: getDeviceInfo()
            }]);
        } catch (e) {}
    };

    const fetchAllBookings = async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('bookings').select('booking_date, shift');
            if (!error) {
                existingBookings = data || [];
                generateDates();
            }
        } catch (err) {
            console.error('Erro ao buscar agendamentos:', err);
        }
    };

    // Máscara de Telefone
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '').slice(0, 11);
            if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
            else if (v.length > 0) v = v.replace(/^(\d*)/, '($1');
            e.target.value = v;
        });
    }

    // Botão de Compartilhar
    const shareBtn = document.getElementById('share-btn-landing');
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const msg = `Opa! Dá uma olhada no treino da TFBOX. Eles estão com aulas experimentais gratuitas: https://www.tfbox.com.br/`;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
        });
    }

    // Inicialização
    // Lógica de Scroll para CTA
    const headerCta = document.getElementById('header-cta');
    const floatingCta = document.getElementById('floating-cta');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            if (headerCta) headerCta.style.display = 'block';
            if (floatingCta) floatingCta.classList.add('visible');
        } else {
            if (headerCta) headerCta.style.display = 'none';
            if (floatingCta) floatingCta.classList.remove('visible');
        }
    });

    logEvent('page_view', 'landing');
    fetchAllBookings();
});
