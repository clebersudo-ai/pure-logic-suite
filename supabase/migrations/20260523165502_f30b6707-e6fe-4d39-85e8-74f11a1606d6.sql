
-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('administrador', 'producao', 'estoque', 'comercial');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  -- First user becomes administrador
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'administrador');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles policies
CREATE POLICY "Profiles: view own or admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: admin all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- User roles policies
CREATE POLICY "Roles: view own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "Roles: admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ===== Domain tables =====
CREATE TABLE public.materias_primas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  fornecedor TEXT,
  codigo_interno TEXT UNIQUE NOT NULL,
  custo_unitario NUMERIC(12,4) NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'kg',
  estoque_atual NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,
  lote_fornecedor TEXT,
  validade DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.materias_primas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  embalagem TEXT,
  validade_meses INT DEFAULT 12,
  custo_calculado NUMERIC(12,4) DEFAULT 0,
  preco_sugerido NUMERIC(12,2) DEFAULT 0,
  margem_percentual NUMERIC(5,2) DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.formulacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  materia_prima_id UUID NOT NULL REFERENCES public.materias_primas(id) ON DELETE RESTRICT,
  percentual NUMERIC(6,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(produto_id, materia_prima_id)
);
ALTER TABLE public.formulacoes ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.ordem_status AS ENUM ('aberta', 'em_producao', 'finalizada', 'cancelada');

CREATE TABLE public.ordens_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_lote TEXT UNIQUE NOT NULL,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade_litros NUMERIC(12,3) NOT NULL,
  tanque TEXT,
  operador_id UUID REFERENCES auth.users(id),
  operador_nome TEXT,
  data_producao DATE NOT NULL DEFAULT CURRENT_DATE,
  sequencia_fabricacao TEXT,
  status ordem_status NOT NULL DEFAULT 'aberta',
  custo_total NUMERIC(12,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ordens_producao ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.movimento_tipo AS ENUM ('entrada', 'saida', 'ajuste');

CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_prima_id UUID NOT NULL REFERENCES public.materias_primas(id) ON DELETE CASCADE,
  tipo movimento_tipo NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL,
  motivo TEXT,
  ordem_producao_id UUID REFERENCES public.ordens_producao(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.qualidade_status AS ENUM ('pendente', 'aprovado', 'reprovado');

CREATE TABLE public.controle_qualidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_producao_id UUID NOT NULL REFERENCES public.ordens_producao(id) ON DELETE CASCADE,
  ph NUMERIC(4,2),
  aparencia TEXT,
  viscosidade NUMERIC(10,2),
  observacoes TEXT,
  status qualidade_status NOT NULL DEFAULT 'pendente',
  analista_id UUID REFERENCES auth.users(id),
  data_analise TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.controle_qualidade ENABLE ROW LEVEL SECURITY;

-- ===== Policies: authenticated users with any role can read all; writes by role =====
CREATE POLICY "MP read" ON public.materias_primas FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "MP write estoque/admin" ON public.materias_primas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'estoque') OR public.has_role(auth.uid(),'administrador'));

CREATE POLICY "Prod read" ON public.produtos FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Prod write admin/comercial" ON public.produtos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'comercial') OR public.has_role(auth.uid(),'producao'));

CREATE POLICY "Form read" ON public.formulacoes FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Form write" ON public.formulacoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'producao'));

CREATE POLICY "OP read" ON public.ordens_producao FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "OP write producao/admin" ON public.ordens_producao FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'producao') OR public.has_role(auth.uid(),'administrador'));

CREATE POLICY "ME read" ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "ME write" ON public.movimentacoes_estoque FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'estoque') OR public.has_role(auth.uid(),'administrador') OR public.has_role(auth.uid(),'producao'));

CREATE POLICY "CQ read" ON public.controle_qualidade FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "CQ write" ON public.controle_qualidade FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'producao') OR public.has_role(auth.uid(),'administrador'));

-- ===== Indexes =====
CREATE INDEX idx_form_produto ON public.formulacoes(produto_id);
CREATE INDEX idx_mov_mp ON public.movimentacoes_estoque(materia_prima_id);
CREATE INDEX idx_op_status ON public.ordens_producao(status);
CREATE INDEX idx_op_data ON public.ordens_producao(data_producao);
