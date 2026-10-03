-- ====================================================================
-- ESQUEMA DE BASE DE DATOS PARA SUPABASE (AUTENTICACIÓN CON GOOGLE)
-- Concurso Intercolegial de Proyectos y Videos
-- ====================================================================

-- 1. EXTENSIÓN PARA UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA DE CONFIGURACIÓN DEL CONCURSO
CREATE TABLE IF NOT EXISTS contest_settings (
  id INT PRIMARY KEY DEFAULT 1,
  contest_name TEXT NOT NULL DEFAULT 'Concurso Intercolegial de Proyectos y Videos',
  are_results_public BOOLEAN NOT NULL DEFAULT false,
  is_voting_active BOOLEAN NOT NULL DEFAULT true,
  is_registration_open BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT single_settings_row CHECK (id = 1)
);

INSERT INTO contest_settings (id, contest_name, are_results_public, is_voting_active, is_registration_open)
VALUES (1, 'Concurso Intercolegial de Proyectos y Videos', false, true, true)
ON CONFLICT (id) DO NOTHING;

-- 3. TABLA DE PROYECTOS REGISTRADOS
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  members TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- 4. TABLA DE LIKES (VOTOS ASOCIADOS AL USUARIO DE GOOGLE)
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_project UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_project ON likes(project_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

-- 5. FUNCIÓN ATÓMICA RPC: TOGGLE LIKE POR USUARIO
CREATE OR REPLACE FUNCTION toggle_like(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_voting_active BOOLEAN;
  v_project_exists BOOLEAN;
  v_liked BOOLEAN;
  v_total_likes INT;
BEGIN
  -- Obtener el ID del usuario autenticado vía JWT
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Debes iniciar sesión con Google para votar.'
    );
  END IF;

  -- Validar si la votación está activa en la configuración
  SELECT is_voting_active INTO v_voting_active FROM contest_settings WHERE id = 1;
  IF NOT COALESCE(v_voting_active, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La votación no está activa en este momento.'
    );
  END IF;

  -- Validar que el proyecto exista y esté aprobado
  SELECT EXISTS(
    SELECT 1 FROM projects WHERE id = p_project_id AND status = 'approved'
  ) INTO v_project_exists;

  IF NOT v_project_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El proyecto no existe o no está habilitado para votación.'
    );
  END IF;

  -- Alternar el voto (eliminar si ya existe, insertar si no existe)
  IF EXISTS (SELECT 1 FROM likes WHERE project_id = p_project_id AND user_id = v_user_id) THEN
    DELETE FROM likes WHERE project_id = p_project_id AND user_id = v_user_id;
    v_liked := false;
  ELSE
    INSERT INTO likes (project_id, user_id)
    VALUES (p_project_id, v_user_id)
    ON CONFLICT (user_id, project_id) DO NOTHING;
    v_liked := true;
  END IF;

  -- Conteo actual de likes
  SELECT COUNT(*) INTO v_total_likes FROM likes WHERE project_id = p_project_id;

  RETURN jsonb_build_object(
    'success', true,
    'liked', v_liked,
    'total_likes', v_total_likes
  );
END;
$$;

-- 6. FUNCIÓN RPC: CONSULTAR LIKES DEL USUARIO AUTENTICADO
CREATE OR REPLACE FUNCTION get_user_likes()
RETURNS TABLE (project_id UUID)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT project_id FROM likes WHERE user_id = auth.uid();
$$;

-- 7. FUNCIÓN RPC: OBTENER RESULTADOS / RANKING
CREATE OR REPLACE FUNCTION get_contest_results()
RETURNS TABLE (
  project_id UUID,
  school_name TEXT,
  project_name TEXT,
  youtube_video_id TEXT,
  youtube_url TEXT,
  members TEXT[],
  total_votes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_results_public BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  SELECT are_results_public INTO v_results_public FROM contest_settings WHERE id = 1;
  v_is_admin := (auth.role() = 'authenticated' AND (auth.jwt() ->> 'email') LIKE '%admin%');

  IF NOT (COALESCE(v_results_public, false) OR v_is_admin) THEN
    RAISE EXCEPTION 'Los resultados de la votación aún no han sido publicados.';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS project_id,
    p.school_name,
    p.project_name,
    p.youtube_video_id,
    p.youtube_url,
    p.members,
    COUNT(l.id) AS total_votes
  FROM projects p
  LEFT JOIN likes l ON p.id = l.project_id
  WHERE p.status = 'approved'
  GROUP BY p.id, p.school_name, p.project_name, p.youtube_video_id, p.youtube_url, p.members
  ORDER BY total_votes DESC, p.created_at ASC;
END;
$$;

-- 8. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
ALTER TABLE contest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Settings" ON contest_settings;
DROP POLICY IF EXISTS "Public Read Approved Projects" ON projects;
DROP POLICY IF EXISTS "Public Insert Pending Projects" ON projects;
DROP POLICY IF EXISTS "Users Read Own Likes" ON likes;
DROP POLICY IF EXISTS "Admin Full Access Projects" ON projects;
DROP POLICY IF EXISTS "Admin Full Access Settings" ON contest_settings;
DROP POLICY IF EXISTS "Admin Full Access Likes" ON likes;

CREATE POLICY "Public Read Settings"
ON contest_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public Read Approved Projects"
ON projects FOR SELECT
TO anon, authenticated
USING (status = 'approved');

CREATE POLICY "Public Insert Pending Projects"
ON projects FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'pending');

CREATE POLICY "Users Read Own Likes"
ON likes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admin Full Access Projects"
ON projects FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin Full Access Settings"
ON contest_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin Full Access Likes"
ON likes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT EXECUTE ON FUNCTION toggle_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_likes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_contest_results() TO anon, authenticated;
