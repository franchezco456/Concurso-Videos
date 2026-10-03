-- ====================================================================
-- MIGRACIÓN A AUTENTICACIÓN GOOGLE PARA VOTOS
-- Ejecuta este script en el SQL Editor de Supabase
-- ====================================================================

-- 1. Recrear tabla likes vinculada a auth.users(id)
DROP TABLE IF EXISTS likes CASCADE;

CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_project UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_project ON likes(project_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

-- 2. Habilitar RLS en likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users Read Own Likes" ON likes;
DROP POLICY IF EXISTS "Admin Full Access Likes" ON likes;

CREATE POLICY "Users Read Own Likes"
ON likes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admin Full Access Likes"
ON likes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Actualizar función toggle_like para usar auth.uid() de Google
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Debes iniciar sesión con Google para votar.'
    );
  END IF;

  SELECT is_voting_active INTO v_voting_active FROM contest_settings WHERE id = 1;
  IF NOT COALESCE(v_voting_active, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La votación no está activa en este momento.'
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM projects WHERE id = p_project_id AND status = 'approved'
  ) INTO v_project_exists;

  IF NOT v_project_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El proyecto no existe o no está habilitado para votación.'
    );
  END IF;

  IF EXISTS (SELECT 1 FROM likes WHERE project_id = p_project_id AND user_id = v_user_id) THEN
    DELETE FROM likes WHERE project_id = p_project_id AND user_id = v_user_id;
    v_liked := false;
  ELSE
    INSERT INTO likes (project_id, user_id)
    VALUES (p_project_id, v_user_id)
    ON CONFLICT (user_id, project_id) DO NOTHING;
    v_liked := true;
  END IF;

  SELECT COUNT(*) INTO v_total_likes FROM likes WHERE project_id = p_project_id;

  RETURN jsonb_build_object(
    'success', true,
    'liked', v_liked,
    'total_likes', v_total_likes
  );
END;
$$;

-- 4. Función para leer los likes del usuario actual
CREATE OR REPLACE FUNCTION get_user_likes()
RETURNS TABLE (project_id UUID)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT project_id FROM likes WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION toggle_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_likes() TO authenticated;
