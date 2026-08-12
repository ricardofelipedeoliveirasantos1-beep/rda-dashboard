CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Politica para permitir que qualquer usuario autenticado veja as despesas
CREATE POLICY "Permitir leitura de despesas para usuarios autenticados" 
ON public.expenses FOR SELECT 
TO authenticated USING (true);

-- Politica para permitir que admins e assistentes (se autorizado no app) insiram despesas
CREATE POLICY "Permitir insercao de despesas para usuarios autenticados" 
ON public.expenses FOR INSERT 
TO authenticated WITH CHECK (true);

-- Politica para permitir que usuarios atualizem
CREATE POLICY "Permitir atualizacao de despesas para usuarios autenticados" 
ON public.expenses FOR UPDATE 
TO authenticated USING (true);

-- Politica para permitir que usuarios deletem
CREATE POLICY "Permitir exclusao de despesas para usuarios autenticados" 
ON public.expenses FOR DELETE 
TO authenticated USING (true);
