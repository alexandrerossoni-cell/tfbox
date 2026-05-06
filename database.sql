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
