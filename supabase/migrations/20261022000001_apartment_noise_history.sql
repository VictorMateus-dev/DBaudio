-- Additive read-only history RPC. Existing ingestion, policies and tables are unchanged.
-- Existing idx_noise_readings_apt_time(apartment_id, recorded_at DESC) serves both ranges.
CREATE SCHEMA IF NOT EXISTS dbsound_history_private;
REVOKE ALL ON SCHEMA dbsound_history_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA dbsound_history_private TO authenticated;

CREATE OR REPLACE FUNCTION dbsound_history_private.read_history(
  p_apartment_id uuid, p_period date, p_mode text,
  p_source text DEFAULT 'esp32', p_test boolean DEFAULT false,
  p_device uuid DEFAULT NULL, p_sensor uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_context jsonb;
  v_result jsonb;
  v_start timestamptz;
  v_end timestamptz;
  v_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Fortaleza')::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Entre como sindico para consultar o historico.' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'apartment_id', a.id, 'apartment_number', a.number,
    'building', b.name, 'condominium', c.name, 'condominium_id', c.id,
    'timezone', 'America/Fortaleza', 'emitter_name', p.full_name,
    'devices', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',d.id,'label',d.device_uid) ORDER BY d.device_uid)
                         FROM public.devices d WHERE d.apartment_id=a.id), '[]'::jsonb),
    'sensors', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'device_id',s.device_id,'label',s.name || ' - ' || s.position) ORDER BY s.channel)
                         FROM public.sensors s JOIN public.devices d ON d.id=s.device_id WHERE d.apartment_id=a.id), '[]'::jsonb)
  ) INTO v_context
  FROM public.apartments a
  JOIN public.buildings b ON b.id=a.building_id
  JOIN public.condominiums c ON c.id=b.condominium_id
  JOIN public.profiles p ON p.id=auth.uid() AND p.role='admin' AND p.condominium_id=c.id AND p.status IS DISTINCT FROM 'blocked'
  WHERE a.id=p_apartment_id;
  IF v_context IS NULL THEN
    RAISE EXCEPTION 'Apartamento indisponivel para esta administracao.' USING ERRCODE='42501';
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('context','month','day') OR p_source IS NULL OR p_source NOT IN ('esp32','manual','simulation') OR p_test IS NULL THEN
    RAISE EXCEPTION 'Filtro de historico invalido.' USING ERRCODE='22023';
  END IF;
  IF p_device IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.devices d WHERE d.id=p_device AND d.apartment_id=p_apartment_id) THEN
    RAISE EXCEPTION 'Dispositivo fora da unidade selecionada.' USING ERRCODE='42501';
  END IF;
  IF p_sensor IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sensors s JOIN public.devices d ON d.id=s.device_id
      WHERE s.id=p_sensor AND d.apartment_id=p_apartment_id AND (p_device IS NULL OR d.id=p_device)) THEN
    RAISE EXCEPTION 'Sensor fora da unidade selecionada.' USING ERRCODE='42501';
  END IF;
  IF p_mode='context' THEN
    RETURN jsonb_build_object('context',v_context,'days','[]'::jsonb,'buckets','[]'::jsonb);
  END IF;
  IF p_period IS NULL OR (p_mode='day' AND p_period>v_today) OR
      (p_mode='month' AND date_trunc('month',p_period::timestamp)>date_trunc('month',v_today::timestamp)) THEN
    RAISE EXCEPTION 'Escolha uma data valida, sem datas futuras.' USING ERRCODE='22023';
  END IF;
  v_start := (CASE WHEN p_mode='month' THEN date_trunc('month',p_period::timestamp) ELSE p_period::timestamp END) AT TIME ZONE 'America/Fortaleza';
  v_end := (CASE WHEN p_mode='month' THEN date_trunc('month',p_period::timestamp)+interval '1 month' ELSE p_period::timestamp+interval '1 day' END) AT TIME ZONE 'America/Fortaleza';
  IF p_mode='month' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('day',x.day,'count',x.n) ORDER BY x.day),'[]'::jsonb) INTO v_result
    FROM (
      SELECT (nr.recorded_at AT TIME ZONE 'America/Fortaleza')::date AS day, count(*) AS n
      FROM public.noise_readings nr
      WHERE nr.apartment_id=p_apartment_id AND nr.recorded_at>=v_start AND nr.recorded_at<v_end AND nr.recorded_at<=CURRENT_TIMESTAMP
        AND nr.source=p_source AND nr.is_test_data=p_test
        AND (p_device IS NULL OR nr.device_id=p_device) AND (p_sensor IS NULL OR nr.sensor_id=p_sensor)
      GROUP BY 1
    ) x;
    RETURN jsonb_build_object('context',v_context,'days',v_result,'buckets','[]'::jsonb,'source',p_source,'is_test_data',p_test,'generated_at',CURRENT_TIMESTAMP);
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'slot',x.slot,'count',x.n,'energy_sum',x.energy,'leq_db',10*log(x.energy/x.n),
      'max_db',x.max_db,'occupied_slots',x.occupied_slots,'devices',x.devices
    ) ORDER BY x.slot),'[]'::jsonb) INTO v_result
  FROM (
    SELECT floor(extract(epoch FROM ((nr.recorded_at AT TIME ZONE 'America/Fortaleza')-p_period::timestamp))/600)::integer AS slot,
      count(*) AS n,
      sum(power(10::double precision,nr.decibel::double precision/10)) AS energy,
      max(nr.decibel)::double precision AS max_db,
      count(DISTINCT floor(extract(epoch FROM nr.recorded_at)/10)) AS occupied_slots,
      array_agg(DISTINCT COALESCE(d.device_uid,nr.device_id::text,'Nao identificado nos registros')) AS devices
    FROM public.noise_readings nr LEFT JOIN public.devices d ON d.id=nr.device_id AND d.apartment_id=p_apartment_id
    WHERE nr.apartment_id=p_apartment_id AND nr.recorded_at>=v_start AND nr.recorded_at<v_end AND nr.recorded_at<=CURRENT_TIMESTAMP
      AND nr.source=p_source AND nr.is_test_data=p_test
      AND (p_device IS NULL OR nr.device_id=p_device) AND (p_sensor IS NULL OR nr.sensor_id=p_sensor)
    GROUP BY 1
  ) x;
  RETURN jsonb_build_object('context',v_context,'days','[]'::jsonb,'buckets',v_result,'source',p_source,'is_test_data',p_test,'generated_at',CURRENT_TIMESTAMP);
END;
$$;
REVOKE ALL ON FUNCTION dbsound_history_private.read_history(uuid,date,text,text,boolean,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION dbsound_history_private.read_history(uuid,date,text,text,boolean,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.noise_history(
  p_apartment_id uuid, p_period date, p_mode text,
  p_source text DEFAULT 'esp32', p_test boolean DEFAULT false,
  p_device uuid DEFAULT NULL, p_sensor uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT dbsound_history_private.read_history(p_apartment_id,p_period,p_mode,p_source,p_test,p_device,p_sensor); $$;
REVOKE ALL ON FUNCTION public.noise_history(uuid,date,text,text,boolean,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.noise_history(uuid,date,text,text,boolean,uuid,uuid) TO authenticated;
COMMENT ON FUNCTION public.noise_history(uuid,date,text,text,boolean,uuid,uuid) IS
  'Read-only apartment history for authenticated condominium admins. Fortaleza timezone, energetic aggregation, no mixed origins, no administrative keys.';
NOTIFY pgrst, 'reload schema';
