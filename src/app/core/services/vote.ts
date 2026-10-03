import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase';
import { ToggleLikeResponse } from '../models/contest.models';

@Injectable({
  providedIn: 'root',
})
export class VoteService {
  private supabaseService = inject(SupabaseService);

  // Set reactivo de IDs de proyectos a los que el usuario autenticado dio like
  public likedProjects = signal<Set<string>>(new Set<string>());

  constructor() {
    // Escuchar cambios de autenticación para recargar votos del usuario
    this.supabaseService.authState$.subscribe((user) => {
      if (user) {
        this.loadUserLikes();
      } else {
        this.likedProjects.set(new Set());
      }
    });
  }

  /**
   * Carga los votos emitidos por el usuario de Google autenticado.
   */
  public async loadUserLikes(): Promise<void> {
    if (!this.supabaseService.isConfigured()) return;

    const user = await this.supabaseService.getCurrentUser();
    if (!user) {
      this.likedProjects.set(new Set());
      return;
    }

    try {
      const { data, error } = await this.supabaseService.client.rpc('get_user_likes');

      if (error) {
        console.error('Error al cargar votos del usuario:', error);
        return;
      }

      const ids = new Set<string>((data || []).map((row: any) => row.project_id));
      this.likedProjects.set(ids);
    } catch (err) {
      console.error('Excepción al cargar votos del usuario:', err);
    }
  }

  /**
   * Verifica si el proyecto actual ya tiene like por el usuario autenticado.
   */
  public hasLiked(projectId: string): boolean {
    return this.likedProjects().has(projectId);
  }

  /**
   * Alterna el voto (like / unlike). Si el usuario no está autenticado, solicita login con Google.
   */
  public async toggleLike(projectId: string): Promise<ToggleLikeResponse> {
    const user = await this.supabaseService.getCurrentUser();
    if (!user) {
      return {
        success: false,
        requiresAuth: true,
        error: 'Debes iniciar sesión con Google para votar.',
      };
    }

    const currentSet = new Set(this.likedProjects());
    const wasLiked = currentSet.has(projectId);

    // Actualización optimista
    if (wasLiked) {
      currentSet.delete(projectId);
    } else {
      currentSet.add(projectId);
    }
    this.likedProjects.set(currentSet);

    // Llamada atómica a la función RPC en Supabase
    try {
      const { data, error } = await this.supabaseService.client.rpc('toggle_like', {
        p_project_id: projectId,
      });

      if (error) {
        this.rollback(projectId, wasLiked);
        return {
          success: false,
          error: error.message || 'Error al registrar el voto.',
        };
      }

      const response = data as ToggleLikeResponse;
      if (!response.success) {
        this.rollback(projectId, wasLiked);
      } else {
        if (response.liked) {
          currentSet.add(projectId);
        } else {
          currentSet.delete(projectId);
        }
        this.likedProjects.set(currentSet);
      }
      return response;
    } catch (err: any) {
      this.rollback(projectId, wasLiked);
      return {
        success: false,
        error: err.message || 'Error de conexión con el servidor.',
      };
    }
  }

  private rollback(projectId: string, wasLiked: boolean): void {
    const current = new Set(this.likedProjects());
    if (wasLiked) {
      current.add(projectId);
    } else {
      current.delete(projectId);
    }
    this.likedProjects.set(current);
  }
}
