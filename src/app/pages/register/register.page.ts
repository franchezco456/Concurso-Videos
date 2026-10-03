import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  IonChip,
  IonLabel,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  schoolOutline,
  bulbOutline,
  logoYoutube,
  peopleOutline,
  addOutline,
  closeCircle,
  checkmarkCircleOutline,
  alertCircleOutline,
  arrowBackOutline,
  videocamOutline,
} from 'ionicons/icons';
import { ProjectService } from '../../core/services/project';
import { YoutubeService } from '../../core/services/youtube';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
    IonChip,
    IonLabel,
  ],
})
export class RegisterPage implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  public youtubeService = inject(YoutubeService);
  private router = inject(Router);

  public isSubmitting = signal<boolean>(false);
  public isSubmittedSuccess = signal<boolean>(false);
  public members = signal<string[]>([]);
  public currentMemberInput = signal<string>('');

  public toastMessage = signal<string>('');
  public isToastOpen = signal<boolean>(false);
  public toastColor = signal<string>('dark');

  public registerForm = this.fb.group({
    school_name: ['', [Validators.required, Validators.minLength(3)]],
    project_name: ['', [Validators.required, Validators.minLength(3)]],
    youtube_url: ['', [Validators.required]],
  });

  // Cálculo reactivo de la miniatura de YouTube a partir del valor ingresado
  public detectedVideoId = signal<string | null>(null);

  constructor() {
    addIcons({
      schoolOutline,
      bulbOutline,
      logoYoutube,
      peopleOutline,
      addOutline,
      closeCircle,
      checkmarkCircleOutline,
      alertCircleOutline,
      arrowBackOutline,
      videocamOutline,
    });
  }

  ngOnInit() {
    this.registerForm.get('youtube_url')?.valueChanges.subscribe((url) => {
      if (url) {
        const id = this.youtubeService.extractVideoId(url);
        this.detectedVideoId.set(id);
      } else {
        this.detectedVideoId.set(null);
      }
    });
  }

  public addMember() {
    const name = this.currentMemberInput().trim();
    if (!name) return;

    if (this.members().includes(name)) {
      this.showToast('Este integrante ya ha sido agregado.', 'warning');
      return;
    }

    this.members.update((list) => [...list, name]);
    this.currentMemberInput.set('');
  }

  public removeMember(index: number) {
    this.members.update((list) => list.filter((_, i) => i !== index));
  }

  public onMemberKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addMember();
    }
  }

  public async onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.showToast('Por favor completa todos los campos requeridos.', 'warning');
      return;
    }

    const videoId = this.detectedVideoId();
    if (!videoId) {
      this.showToast('El enlace de YouTube ingresado no es válido.', 'danger');
      return;
    }

    if (this.members().length === 0) {
      this.showToast('Debes agregar al menos un integrante al equipo.', 'warning');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const formVal = this.registerForm.value;
      await this.projectService.registerProject({
        school_name: formVal.school_name!.trim(),
        project_name: formVal.project_name!.trim(),
        youtube_url: formVal.youtube_url!.trim(),
        youtube_video_id: videoId,
        members: this.members(),
      });

      this.isSubmittedSuccess.set(true);
    } catch (err: any) {
      console.error('Error al registrar proyecto:', err);
      this.showToast(err.message || 'Error al enviar el formulario. Intenta nuevamente.', 'danger');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  public resetForm() {
    this.registerForm.reset();
    this.members.set([]);
    this.detectedVideoId.set(null);
    this.currentMemberInput.set('');
    this.isSubmittedSuccess.set(false);
  }

  private showToast(message: string, color: string = 'dark') {
    this.toastMessage.set(message);
    this.toastColor.set(color);
    this.isToastOpen.set(true);
  }
}
