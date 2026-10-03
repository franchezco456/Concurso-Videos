import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonToast,
  ModalController,
  AlertController,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  playCircle,
  heart,
  heartOutline,
  schoolOutline,
  peopleOutline,
  addCircleOutline,
  trophyOutline,
  lockClosedOutline,
  informationCircleOutline,
  videocamOutline,
  shieldCheckmarkOutline,
  logoGoogle,
  logOutOutline,
  personCircleOutline,
} from 'ionicons/icons';
import { Project, ContestSettings } from '../core/models/contest.models';
import { ProjectService } from '../core/services/project';
import { VoteService } from '../core/services/vote';
import { SupabaseService } from '../core/services/supabase';
import { YoutubeService } from '../core/services/youtube';
import { VideoPlayerModalComponent } from '../components/video-player-modal/video-player-modal.component';
import { User } from '@supabase/supabase-js';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonToast,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class HomePage implements OnInit {
  private projectService = inject(ProjectService);
  public voteService = inject(VoteService);
  public supabaseService = inject(SupabaseService);
  public youtubeService = inject(YoutubeService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);

  public projects = signal<Project[]>([]);
  public settings = signal<ContestSettings | null>(null);
  public isLoading = signal<boolean>(true);
  public searchTerm = signal<string>('');
  public currentUser = signal<User | null>(null);

  public toastMessage = signal<string>('');
  public isToastOpen = signal<boolean>(false);
  public toastColor = signal<string>('dark');

  // Filtro reactivo por nombre de proyecto o estudiante/integrante
  public filteredProjects = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) {
      return this.projects();
    }

    return this.projects().filter((project) => {
      const matchProject = project.project_name.toLowerCase().includes(term);
      const matchMember = project.members.some((m) => m.toLowerCase().includes(term));
      const matchSchool = project.school_name.toLowerCase().includes(term);

      return matchProject || matchMember || matchSchool;
    });
  });

  constructor() {
    addIcons({
      playCircle,
      heart,
      heartOutline,
      schoolOutline,
      peopleOutline,
      addCircleOutline,
      trophyOutline,
      lockClosedOutline,
      informationCircleOutline,
      videocamOutline,
      shieldCheckmarkOutline,
      logoGoogle,
      logOutOutline,
      personCircleOutline,
    });
  }

  async ngOnInit() {
    this.supabaseService.authState$.subscribe((user) => {
      this.currentUser.set(user);
    });

    await this.loadData();
  }

  public async loadData(event?: any) {
    this.isLoading.set(true);
    try {
      const [settingsData, projectsData] = await Promise.all([
        this.projectService.getSettings(),
        this.projectService.getApprovedProjects(),
        this.voteService.loadUserLikes(),
      ]);
      this.settings.set(settingsData);
      this.projects.set(projectsData);
    } catch (err) {
      console.error('Error al cargar datos de inicio:', err);
    } finally {
      this.isLoading.set(false);
      if (event) {
        event.target.complete();
      }
    }
  }

  public async loginWithGoogle() {
    try {
      await this.supabaseService.signInWithGoogle();
    } catch (err: any) {
      this.showToast('No se pudo iniciar sesión con Google: ' + err.message, 'danger');
    }
  }

  public async logout() {
    await this.supabaseService.signOut();
    this.showToast('Has cerrado sesión.', 'medium');
  }

  public async openVideoModal(project: Project) {
    const modal = await this.modalCtrl.create({
      component: VideoPlayerModalComponent,
      componentProps: {
        project,
        allowVoting: this.settings()?.is_voting_active ?? true,
      },
      cssClass: 'video-modal-custom',
    });
    await modal.present();
  }

  public async onToggleLike(project: Project, event: Event) {
    event.stopPropagation();
    if (!this.settings()?.is_voting_active) {
      this.showToast('La votación no está activa en este momento.', 'warning');
      return;
    }

    const res = await this.voteService.toggleLike(project.id);
    if (res.requiresAuth) {
      await this.promptGoogleLogin();
      return;
    }

    if (res.success) {
      if (res.liked) {
        this.showToast('¡Voto registrado con éxito!', 'success');
      } else {
        this.showToast('Has retirado tu voto.', 'medium');
      }
    } else {
      this.showToast(res.error || 'No se pudo procesar tu voto.', 'danger');
    }
  }

  private async promptGoogleLogin() {
    const alert = await this.alertCtrl.create({
      header: 'Identifícate para Votar',
      subHeader: 'Garantía de transparencia',
      message: 'Para asegurar que cada persona vote una sola vez y evitar duplicados, continúa con tu cuenta de Google en 1 clic.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Continuar con Google',
          handler: () => {
            this.loginWithGoogle();
          },
        },
      ],
    });
    await alert.present();
  }

  public isProjectLiked(projectId: string): boolean {
    return this.voteService.hasLiked(projectId);
  }

  private showToast(message: string, color: string = 'dark') {
    this.toastMessage.set(message);
    this.toastColor.set(color);
    this.isToastOpen.set(true);
  }
}
