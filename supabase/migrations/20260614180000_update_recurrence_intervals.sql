-- Support custom recurrence intervals (bimestral, trimestral, semestral, anual) in proxima_data_recorrente

CREATE OR REPLACE FUNCTION public.proxima_data_recorrente(
  p_apos date,
  p_tipo text,
  p_dia_base integer,
  p_modo_mensal text,
  p_criado_em timestamptz
)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_tipo text := COALESCE(p_tipo, 'mensal');
  v_dia integer;
  v_candidata date;
  v_inicio date := COALESCE(p_criado_em::date, p_apos);
  v_ciclos integer;
  v_interval interval := interval '1 month';
BEGIN
  IF v_tipo = 'diaria' THEN
    RETURN p_apos + 1;
  END IF;

  IF v_tipo = 'quinzenal' THEN
    v_dia := LEAST(GREATEST(COALESCE(p_dia_base, 15), 1), 15);

    v_candidata := make_date(
      EXTRACT(YEAR FROM p_apos)::integer,
      EXTRACT(MONTH FROM p_apos)::integer,
      LEAST(v_dia, EXTRACT(DAY FROM (date_trunc('month', p_apos) + interval '1 month - 1 day'))::integer)
    );
    IF v_candidata > p_apos THEN
      RETURN v_candidata;
    END IF;

    v_candidata := make_date(
      EXTRACT(YEAR FROM p_apos)::integer,
      EXTRACT(MONTH FROM p_apos)::integer,
      LEAST(v_dia + 15, EXTRACT(DAY FROM (date_trunc('month', p_apos) + interval '1 month - 1 day'))::integer)
    );
    IF v_candidata > p_apos THEN
      RETURN v_candidata;
    END IF;

    v_candidata := (date_trunc('month', p_apos) + interval '1 month')::date;
    RETURN make_date(
      EXTRACT(YEAR FROM v_candidata)::integer,
      EXTRACT(MONTH FROM v_candidata)::integer,
      LEAST(v_dia, EXTRACT(DAY FROM (date_trunc('month', v_candidata) + interval '1 month - 1 day'))::integer)
    );
  END IF;

  -- Configure the interval based on the recurrence type
  IF v_tipo = 'bimestral' THEN
    v_interval := interval '2 months';
  ELSIF v_tipo = 'trimestral' THEN
    v_interval := interval '3 months';
  ELSIF v_tipo = 'semestral' THEN
    v_interval := interval '6 months';
  ELSIF v_tipo = 'anual' THEN
    v_interval := interval '12 months';
  ELSE
    v_interval := interval '1 month';
  END IF;

  IF p_modo_mensal = 'data_cadastro' THEN
    DECLARE
      v_dias_ciclo integer := 30;
    BEGIN
      IF v_tipo = 'bimestral' THEN v_dias_ciclo := 60;
      ELSIF v_tipo = 'trimestral' THEN v_dias_ciclo := 90;
      ELSIF v_tipo = 'semestral' THEN v_dias_ciclo := 180;
      ELSIF v_tipo = 'anual' THEN v_dias_ciclo := 365;
      END IF;
      
      v_ciclos := GREATEST(0, ((p_apos - v_inicio) / v_dias_ciclo) + 1);
      v_candidata := v_inicio + (v_ciclos * v_dias_ciclo);
      WHILE v_candidata <= p_apos LOOP
        v_candidata := v_candidata + v_dias_ciclo;
      END LOOP;
      RETURN v_candidata;
    END;
  END IF;

  v_dia := LEAST(GREATEST(COALESCE(p_dia_base, 1), 1), 31);
  
  DECLARE
    v_base_inicio date;
  BEGIN
    v_base_inicio := make_date(
      EXTRACT(YEAR FROM v_inicio)::integer,
      EXTRACT(MONTH FROM v_inicio)::integer,
      LEAST(v_dia, EXTRACT(DAY FROM (date_trunc('month', v_inicio) + interval '1 month - 1 day'))::integer)
    );
    
    v_candidata := v_base_inicio;
    WHILE v_candidata <= p_apos LOOP
      v_candidata := (date_trunc('month', v_candidata) + v_interval)::date;
      v_candidata := make_date(
        EXTRACT(YEAR FROM v_candidata)::integer,
        EXTRACT(MONTH FROM v_candidata)::integer,
        LEAST(v_dia, EXTRACT(DAY FROM (date_trunc('month', v_candidata) + interval '1 month - 1 day'))::integer)
      );
    END LOOP;
    RETURN v_candidata;
  END;
END;
$$;
