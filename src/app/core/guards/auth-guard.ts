import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  // Si Supabase no está configurado aún, se redirige al login con mensaje explicativo
  if (!supabaseService.isConfigured()) {
    console.warn('Supabase no está configurado. Redirigiendo a /admin-login');
    router.navigate(['/admin-login'], {
      queryParams: { returnUrl: state.url, notConfigured: true },
    });
    return false;
  }

  try {
    const session = await supabaseService.getSession();
    if (session && session.user) {
      return true;
    }
  } catch (err) {
    console.error('Error verificando sesión en authGuard:', err);
  }

  // Redirigir a la pantalla de login de administrador
  router.navigate(['/admin-login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
