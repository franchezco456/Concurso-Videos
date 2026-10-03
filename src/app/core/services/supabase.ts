import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private currentUser$ = new BehaviorSubject<User | null>(null);

  constructor() {
    this.initSupabase();
  }

  private initSupabase(): void {
    if (this.isConfigured()) {
      try {
        const cleanUrl = environment.supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
        this.supabase = createClient(cleanUrl, environment.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });

        // Cargar sesión inicial
        this.supabase.auth.getSession().then(({ data }) => {
          this.currentUser$.next(data.session?.user ?? null);
        });

        // Escuchar cambios de estado de autenticación
        this.supabase.auth.onAuthStateChange((_event, session) => {
          this.currentUser$.next(session?.user ?? null);
        });
      } catch (err) {
        console.warn('Error inicializando cliente de Supabase:', err);
      }
    }
  }

  public isConfigured(): boolean {
    return (
      !!environment.supabaseUrl &&
      !environment.supabaseUrl.includes('TU-PROYECTO') &&
      !!environment.supabaseAnonKey &&
      !environment.supabaseAnonKey.includes('TU-SUPABASE-ANON-KEY')
    );
  }

  public get client(): SupabaseClient {
    if (!this.supabase) {
      if (this.isConfigured()) {
        this.initSupabase();
      }
      if (!this.supabase) {
        throw new Error('Supabase no está configurado. Por favor configura supabaseUrl y supabaseAnonKey en src/environments/environment.ts.');
      }
    }
    return this.supabase;
  }

  public get authState$(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  public async getSession(): Promise<Session | null> {
    if (!this.supabase) return null;
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  public async getCurrentUser(): Promise<User | null> {
    if (!this.supabase) return null;
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  public async signIn(email: string, password: string) {
    if (!this.supabase) throw new Error('Supabase no está configurado.');
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  public async signInWithGoogle(): Promise<void> {
    if (!this.supabase) throw new Error('Supabase no está configurado.');
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/home',
      },
    });
    if (error) {
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  }

  public async signOut() {
    if (!this.supabase) return;
    await this.supabase.auth.signOut();
    this.currentUser$.next(null);
  }
}
