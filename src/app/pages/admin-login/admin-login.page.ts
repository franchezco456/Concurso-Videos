import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSpinner,
  IonToast,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  lockClosedOutline,
  mailOutline,
  keyOutline,
  shieldCheckmarkOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.page.html',
  styleUrls: ['./admin-login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSpinner,
    IonToast,
  ],
})
export class AdminLoginPage implements OnInit {
  private fb = inject(FormBuilder);
  public supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public isSubmitting = signal<boolean>(false);
  public isNotConfigured = signal<boolean>(false);

  public toastMessage = signal<string>('');
  public isToastOpen = signal<boolean>(false);
  public toastColor = signal<string>('dark');

  private returnUrl: string = '/admin';

  public loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    addIcons({
      lockClosedOutline,
      mailOutline,
      keyOutline,
      shieldCheckmarkOutline,
      informationCircleOutline,
    });
  }

  async ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
      }
      if (params['notConfigured'] || !this.supabaseService.isConfigured()) {
        this.isNotConfigured.set(true);
      }
    });

    // Si ya está autenticado, ir directo a /admin
    if (this.supabaseService.isConfigured()) {
      const user = await this.supabaseService.getCurrentUser();
      if (user) {
        this.router.navigateByUrl(this.returnUrl);
      }
    }
  }

  public async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.showToast('Ingresa un correo y contraseña válidos.', 'warning');
      return;
    }

    if (!this.supabaseService.isConfigured()) {
      this.showToast(
        'Supabase no está configurado aún. Por favor coloca tus credenciales en src/environments/environment.ts',
        'warning'
      );
      return;
    }

    this.isSubmitting.set(true);
    const { email, password } = this.loginForm.value;

    try {
      const { data, error } = await this.supabaseService.signIn(email!.trim(), password!);
      if (error) {
        this.showToast('Credenciales incorrectas: ' + error.message, 'danger');
        return;
      }

      if (data?.session) {
        this.showToast('¡Bienvenido al Panel de Administración!', 'success');
        this.router.navigateByUrl(this.returnUrl);
      }
    } catch (err: any) {
      this.showToast(err.message || 'Error inesperado al iniciar sesión.', 'danger');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private showToast(message: string, color: string = 'dark') {
    this.toastMessage.set(message);
    this.toastColor.set(color);
    this.isToastOpen.set(true);
  }
}
