// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = 'https://xbrvbsiatwxcmnssaxwe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CWvQLBuFfWih-VxxqZT9XQ_lg6zARGR';

document.addEventListener('DOMContentLoaded', () => {
    const goalCards = document.querySelectorAll('.goal-card');
    const timeGrid = document.getElementById('time-grid');
    const nameInput = document.getElementById('name');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const dateSelector = document.getElementById('date-selector');
    const heroCta = document.getElementById('hero-cta');
    const phoneInput = document.getElementById('phone');
    
    if (heroCta) {
        heroCta.addEventListener('click', () => scrollToNext('#agendar'));
    }

    // Limpar o hash da URL ao carregar para evitar pulos automáticos ao atualizar
    if (window.location.hash) {
        window.history.replaceState('', document.title, window.location.pathname + window.location.search);
    }

    // Bloquear scroll manual
    const lockScroll = () => {
        const preventDefault = (e) => {
            if (e.target.closest('.date-selector') || e.target.closest('.time-grid')) {
                return;
            }
            e.preventDefault();
        };
        const keys = {37: 1, 38: 1, 39: 1, 40: 1, 32: 1, 33: 1, 34: 1, 35: 1, 36: 1};
        const preventDefaultForScrollKeys = (e) => {
            if (keys[e.keyCode]) {
                e.preventDefault();
                return false;
            }
        }
        window.addEventListener('wheel', preventDefault, { passive: false });
        window.addEventListener('touchmove', preventDefault, { passive: false });
        window.addEventListener('keydown', preventDefaultForScrollKeys, false);
    };

    lockScroll();

    document.querySelectorAll('.back-step-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-back');
            const pos = btn.getAttribute('data-pos') || 'start';
            
            // Se for o botão de mudar data, esconde ele ao clicar
            if (btn.classList.contains('small-back')) {
                btn.classList.remove('visible');
            }
            
            scrollToNext(target, pos);
        });
    });

    // Máscara para o telefone
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length > 6) {
                value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/^(\d*)/, '($1');
            }
            e.target.value = value;
        });
    }
    
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

    const scrollToNext = (selector, position = 'start') => {
        const element = document.querySelector(selector);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: position });
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
                
                // Mostrar o botão de mudar data apenas quando estiver nos horários
                // Mostrar o botão de mudar data apenas quando estiver nos horários
                const smallBack = document.querySelector('.small-back');
                if (smallBack) smallBack.classList.add('visible');
                
                // Rolar para a sessão de horários garantindo que o botão de voltar apareça
                scrollToNext('.selection-step:nth-child(2)', 'center');
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
            const vagas = getSlotVagas(selectedDate, slot.time);
            const isAvailable = vagas > 0;
            const card = document.createElement('div');
            card.className = `time-card ${!isAvailable ? 'disabled' : ''}`;
            
            if (!isAvailable) {
                card.style.opacity = '0.3';
                card.style.pointerEvents = 'none';
            }
            
            card.innerHTML = `
                <div class="time-header">
                    <h4>${slot.time}</h4>
                    <span class="vagas-count ${vagas === 1 ? 'last-vaga' : ''}">${isAvailable ? `${vagas} ${vagas === 1 ? 'vaga' : 'vagas'}` : 'LOTADO'}</span>
                </div>
                <span class="professor">${slot.professor}</span>
            `;

            card.addEventListener('click', (e) => {
                if (!isAvailable) return;
                
                // Forçar remoção de classes e seleção
                document.querySelectorAll('.time-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                selectedTime = slot.time;
                selectedProfessor = slot.professor;
                
                // Navegação imediata
                scrollToNext('#dados-section', 'center');
                
                // Feedback tátil/visual imediato para mobile
                if (window.navigator.vibrate) window.navigator.vibrate(10);
                
                // Focar no nome após o scroll ter terminado completamente
                setTimeout(() => {
                    const nameInput = document.getElementById('name');
                    if (nameInput) nameInput.focus();
                }, 1000);
            }, { passive: false });
            timeGrid.appendChild(card);
        });
    };

    const getSlotVagas = (date, time) => {
        if (!existingBookings) return 2;
        const bookings = existingBookings.filter(b => b.booking_date === date && b.shift === time);
        return Math.max(0, 2 - bookings.length);
    };


    goalCards.forEach(card => {
        card.addEventListener('click', () => {
            goalCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedGoal = card.getAttribute('data-goal');
            scrollToNext('#agenda-section');
        });
    });

    whatsappBtn.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const phone = phoneInput ? phoneInput.value.trim() : '';
        
        // Reset errors
        nameInput.classList.remove('error');
        if (phoneInput) phoneInput.classList.remove('error');
        document.querySelectorAll('.goals-grid, .date-selector, .time-grid').forEach(el => {
            el.classList.remove('error-container');
        });

        // Validação hierárquica
        if (!selectedGoal) {
            scrollToNext('.booking-section h2');
            const el = document.querySelector('.goals-grid');
            el.classList.add('error-container');
            el.addEventListener('click', () => el.classList.remove('error-container'), { once: true });
            return;
        }
        if (!selectedDate) {
            scrollToNext('#date-selector');
            const el = document.querySelector('.date-selector');
            el.classList.add('error-container');
            el.addEventListener('click', () => el.classList.remove('error-container'), { once: true });
            return;
        }
        if (!selectedTime) {
            scrollToNext('#time-grid');
            const el = document.querySelector('.time-grid');
            el.classList.add('error-container');
            el.addEventListener('click', () => el.classList.remove('error-container'), { once: true });
            return;
        }
        if (!name) {
            nameInput.classList.add('error');
            nameInput.focus();
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInput.addEventListener('input', () => nameInput.classList.remove('error'), { once: true });
            return;
        }
        if (phoneInput && phone.length < 14) { // (00) 00000-0000
            phoneInput.classList.add('error');
            phoneInput.focus();
            phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            phoneInput.addEventListener('input', () => phoneInput.classList.remove('error'), { once: true });
            return;
        }

        whatsappBtn.innerText = 'PROCESSANDO...';
        whatsappBtn.disabled = true;
        try {
            if (supabase) {
                // Verificar lotação real antes de inserir
                const { data: existing, error: countError } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('booking_date', selectedDate)
                    .eq('shift', selectedTime);
                
                if (existing && existing.length >= 2) {
                    alert('Este horário acabou de lotar! Por favor, escolha outro.');
                    await fetchAllBookings();
                    whatsappBtn.innerText = 'RESERVAR MINHA VAGA AGORA';
                    whatsappBtn.disabled = false;
                    return;
                }

                console.log('Tentando inserir:', { name, phone, goal: selectedGoal, booking_date: selectedDate, shift: selectedTime });
                const { error: insertError } = await supabase.from('bookings').insert([{ 
                    name, 
                    phone, 
                    goal: selectedGoal, 
                    booking_date: selectedDate, 
                    shift: selectedTime 
                }]);

                if (insertError) {
                    console.error('Erro na inserção:', insertError);
                    throw insertError;
                }
                console.log('Inserção bem-sucedida no Banco de Dados!');
                logEvent('whatsapp_click', `Vaga: ${selectedDate} ${selectedTime}`); // LOG DE CONVERSÃO
            }
            const message = `🔥 *NOVO AGENDAMENTO - TFBOX* 🔥\n\nOlá! Acabei de agendar minha aula experimental pelo site:\n\n👤 *NOME:* ${name}\n📱 *CONTATO:* ${phone}\n🎯 *FOCO:* ${selectedGoal}\n📅 *DATA:* ${selectedDate}\n🕒 *HORÁRIO:* ${selectedTime}\n👨‍🏫 *PROFESSOR:* ${selectedProfessor}\n\nAguardo a confirmação! 🚀`;
            window.location.href = `https://wa.me/555192438029?text=${encodeURIComponent(message)}`;
            whatsappBtn.innerText = 'RESERVA CONCLUÍDA!';
        } catch (err) { alert('Erro no agendamento.'); whatsappBtn.innerText = 'RESERVAR MINHA VAGA AGORA'; whatsappBtn.disabled = false; }
    });

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
            if (selectedDate) updateTimeUI(); // Atualizar horários se estiver neles
        } catch (err) { console.error(err.message); updateDateAvailabilityUI(); }
    };

    // --- RASTREIO E ANALYTICS ---
    const sessionId = Math.random().toString(36).substring(7);
    const getDeviceInfo = () => {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Mobile";
        return "Desktop";
    };

    const logEvent = async (type, data = '') => {
        if (!supabase) return;
        try {
            await supabase.from('visitor_logs').insert([{
                session_id: sessionId,
                event_type: type,
                event_data: data,
                device: getDeviceInfo(),
                browser: navigator.userAgent.split(') ')[0].split(' (')[1] || 'Unknown'
            }]);
        } catch (e) { console.error('Erro log:', e); }
    };

    // Log inicial
    logEvent('page_view', window.location.pathname);

    // --- REALTIME ---
    if (supabase) {
        supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
                console.log('Mudança detectada no banco! Atualizando vagas...');
                fetchAllBookings();
            })
            .subscribe();
    }

    // Ajuste inteligente: Só re-enquadra se o teclado REALMENTE subir (detectando mudança de altura da tela)
    let originalHeight = window.innerHeight;
    window.addEventListener('resize', () => {
        const isKeyboardUp = window.innerHeight < originalHeight * 0.85;
        if (isKeyboardUp) {
            const activeInput = document.activeElement;
            if (activeInput && activeInput.tagName === 'INPUT') {
                activeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

    goalCards.forEach(card => {
        card.addEventListener('click', () => {
            goalCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedGoal = card.getAttribute('data-goal');
            logEvent('goal_click', selectedGoal); // LOG
            scrollToNext('#agenda-section');
        });
    });

    generateDates();
    fetchAllBookings();
});
