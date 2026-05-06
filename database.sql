-- Criar tabela de agendamentos
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    booking_date TEXT NOT NULL, -- Usaremos a string da data para simplificar
    shift TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir que qualquer pessoa insira dados (Insert)
CREATE POLICY "Permitir inserção pública" ON bookings
FOR INSERT WITH CHECK (true);

-- Criar política para permitir que qualquer pessoa veja os dados (Select)
-- Necessário para o frontend contar quantos agendamentos existem
CREATE POLICY "Permitir leitura pública" ON bookings
FOR SELECT USING (true);
-- Tabela de Logs de Visitantes para Rastreio
CREATE TABLE visitor_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT,
    event_type TEXT, -- 'page_view', 'goal_click', 'date_click', 'whatsapp_click'
    event_data TEXT, -- detalhes (ex: qual objetivo clicou)
    device TEXT,
    browser TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir inserção de logs" ON visitor_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de logs" ON visitor_logs FOR SELECT USING (true);
