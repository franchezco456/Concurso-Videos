import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { Project, ContestSettings, ContestResult, ProjectStatus } from '../models/contest.models';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private supabaseService = inject(SupabaseService);

  /**
   * Obtiene la configuración general del concurso.
   */
  public async getSettings(): Promise<ContestSettings> {
    if (!this.supabaseService.isConfigured()) {
      return {
        id: 1,
        contest_name: 'Concurso Intercolegial de Proyectos y Videos',
        are_results_public: false,
        is_voting_active: true,
        is_registration_open: true,
      };
    }

    const { data, error } = await this.supabaseService.client
      .from('contest_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error al obtener configuración:', error);
      throw error;
    }
    return data as ContestSettings;
  }

  /**
   * Actualiza la configuración general del concurso (solo admin).
   */
  public async updateSettings(settings: Partial<ContestSettings>): Promise<ContestSettings> {
    const { data, error } = await this.supabaseService.client
      .from('contest_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar configuración:', error);
      throw error;
    }
    return data as ContestSettings;
  }

  /**
   * Obtiene los proyectos aprobados para el público.
   */
  public async getApprovedProjects(): Promise<Project[]> {
    if (!this.supabaseService.isConfigured()) {
      return this.getMockProjects();
    }

    const { data, error } = await this.supabaseService.client
      .from('projects')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener proyectos aprobados:', error);
      throw error;
    }
    return (data || []) as Project[];
  }

  /**
   * Registra un nuevo proyecto con estado 'pending'.
   */
  public async registerProject(project: {
    school_name: string;
    project_name: string;
    youtube_url: string;
    youtube_video_id: string;
    members: string[];
  }): Promise<Project> {
    if (!this.supabaseService.isConfigured()) {
      return {
        id: 'mock-new-id',
        ...project,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }

    const { error } = await this.supabaseService.client
      .from('projects')
      .insert({
        ...project,
        status: 'pending',
      });

    if (error) {
      console.error('Error al registrar proyecto:', error);
      throw error;
    }
    return {
      id: '',
      ...project,
      status: 'pending',
    };
  }

  /**
   * Obtiene proyectos para el panel de administración con conteo de votos.
   */
  public async getAdminProjects(status?: ProjectStatus): Promise<Project[]> {
    let query = this.supabaseService.client
      .from('projects')
      .select('*, likes(count)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error al obtener proyectos para admin:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      ...item,
      total_likes: item.likes?.[0]?.count ?? 0,
    })) as Project[];
  }

  /**
   * Modifica el estado de un proyecto (aprobar, rechazar, etc.).
   */
  public async updateProjectStatus(id: string, status: ProjectStatus): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('projects')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar estado del proyecto:', error);
      throw error;
    }
  }

  /**
   * Elimina un proyecto (solo admin).
   */
  public async deleteProject(id: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar proyecto:', error);
      throw error;
    }
  }

  /**
   * Obtiene los resultados finales de la votación (llamando a la función RPC).
   * Aplica clasificación deportiva estándar (empates comparten la misma posición).
   */
  public async getResults(): Promise<ContestResult[]> {
    if (!this.supabaseService.isConfigured()) {
      return this.getMockResults();
    }

    const { data, error } = await this.supabaseService.client.rpc('get_contest_results');
    if (error) {
      console.error('Error al consultar resultados:', error);
      throw error;
    }

    const rawResults = (data || []) as ContestResult[];
    const totalAllVotes = rawResults.reduce((sum, r) => sum + Number(r.total_votes), 0);

    // Contabilizar frecuencias de votos para identificar empates
    const voteCounts: Record<number, number> = {};
    rawResults.forEach((r) => {
      const v = Number(r.total_votes);
      voteCounts[v] = (voteCounts[v] || 0) + 1;
    });

    // Asignación de rangos según competencia estándar (si hay empate, comparten puesto)
    let currentRank = 1;
    return rawResults.map((r, index) => {
      const votes = Number(r.total_votes);
      if (index > 0) {
        const prevVotes = Number(rawResults[index - 1].total_votes);
        if (votes < prevVotes) {
          currentRank = index + 1;
        }
      }

      return {
        ...r,
        total_votes: votes,
        rank: currentRank,
        percentage: totalAllVotes > 0 ? Math.round((votes / totalAllVotes) * 100) : 0,
        is_tie: (voteCounts[votes] || 0) > 1,
      };
    });
  }

  // Datos mock para pruebas visuales en caso de que aún no se configuren credenciales
  private getMockProjects(): Project[] {
    return [
      {
        id: '11111111-1111-1111-1111-111111111111',
        school_name: 'I.E. San Francisco de Asís',
        project_name: 'Robot Autónomo Limpiador de Playas',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        youtube_video_id: 'dQw4w9WgXcQ',
        members: ['Carlos Pérez', 'María Gómez', 'Andrés Restrepo'],
        status: 'approved',
        created_at: new Date().toISOString(),
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        school_name: 'Colegio Mayor de Antioquia',
        project_name: 'Sistema de Riego Inteligente con Energía Solar',
        youtube_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        youtube_video_id: '9bZkp7q19f0',
        members: ['Valentina Morales', 'Juan David Cano'],
        status: 'approved',
        created_at: new Date().toISOString(),
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        school_name: 'I.E. Escuela Normal Superior',
        project_name: 'App Móvil de Inclusión en Lengua de Señas',
        youtube_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
        youtube_video_id: 'kJQP7kiw5Fk',
        members: ['Laura Rojas', 'Daniel Castro', 'Sofía Villa'],
        status: 'approved',
        created_at: new Date().toISOString(),
      },
    ];
  }

  private getMockResults(): ContestResult[] {
    return [
      {
        project_id: '11111111-1111-1111-1111-111111111111',
        school_name: 'I.E. San Francisco de Asís',
        project_name: 'Robot Autónomo Limpiador de Playas',
        youtube_video_id: 'dQw4w9WgXcQ',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        members: ['Carlos Pérez', 'María Gómez', 'Andrés Restrepo'],
        total_votes: 142,
        percentage: 45,
        rank: 1,
      },
      {
        project_id: '22222222-2222-2222-2222-222222222222',
        school_name: 'Colegio Mayor de Antioquia',
        project_name: 'Sistema de Riego Inteligente con Energía Solar',
        youtube_video_id: '9bZkp7q19f0',
        youtube_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        members: ['Valentina Morales', 'Juan David Cano'],
        total_votes: 110,
        percentage: 35,
        rank: 2,
      },
      {
        project_id: '33333333-3333-3333-3333-333333333333',
        school_name: 'I.E. Escuela Normal Superior',
        project_name: 'App Móvil de Inclusión en Lengua de Señas',
        youtube_video_id: 'kJQP7kiw5Fk',
        youtube_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
        members: ['Laura Rojas', 'Daniel Castro', 'Sofía Villa'],
        total_votes: 63,
        percentage: 20,
        rank: 3,
      },
    ];
  }
}
