import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonToggle,
  IonSpinner,
  IonToast,
  IonRefresher,
  IonRefresherContent,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  closeCircle,
  trashOutline,
  playCircle,
  logOutOutline,
  settingsOutline,
  schoolOutline,
  peopleOutline,
  eyeOutline,
  eyeOffOutline,
  refreshOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { Project, ContestSettings, ProjectStatus } from '../../core/models/contest.models';
import { ProjectService } from '../../core/services/project';
import { SupabaseService } from '../../core/services/supabase';
import { YoutubeService } from '../../core/services/youtube';
import { VideoPlayerModalComponent } from '../../components/video-player-modal/video-player-modal.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonToggle,
    IonSpinner,
    IonToast,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class AdminPage implements OnInit {
  private projectService = inject(ProjectService);
  public supabaseService = inject(SupabaseService);
  public youtubeService = inject(YoutubeService);
  private modalCtrl = inject(ModalController);
  private router = inject(Router);

  public settings = signal<ContestSettings | null>(null);
  public projects = signal<Project[]>([]);
  public isLoading = signal<boolean>(true);
  public selectedSegment = signal<ProjectStatus>('pending');
  public userEmail = signal<string>('Administrador');

  public toastMessage = signal<string>('');
  public isToastOpen = signal<boolean>(false);
  public toastColor = signal<string>('dark');

  // Filtros reactivos por segmento
  public pendingProjects = computed(() => this.projects().filter((p) => p.status === 'pending'));
  public approvedProjects = computed(() => this.projects().filter((p) => p.status === 'approved'));
  public rejectedProjects = computed(() => this.projects().filter((p) => p.status === 'rejected'));

  public currentSegmentProjects = computed(() => {
    switch (this.selectedSegment()) {
      case 'pending':
        return this.pendingProjects();
      case 'approved':
        return this.approvedProjects();
      case 'rejected':
        return this.rejectedProjects();
      default:
        return [];
    }
  });

  constructor() {
    addIcons({
      checkmarkCircle,
      closeCircle,
      trashOutline,
      playCircle,
      logOutOutline,
      settingsOutline,
      schoolOutline,
      peopleOutline,
      eyeOutline,
      eyeOffOutline,
      refreshOutline,
      shieldCheckmarkOutline,
    });
  }

  async ngOnInit() {
    const user = await this.supabaseService.getCurrentUser();
    if (user?.email) {
      this.userEmail.set(user.email);
    }
    await this.loadData();
  }

  public async loadData(event?: any) {
    this.isLoading.set(true);
    try {
      const [settingsData, projectsData] = await Promise.all([
        this.projectService.getSettings(),
        this.projectService.getAdminProjects(),
      ]);
      this.settings.set(settingsData);
      this.projects.set(projectsData);
    } catch (err) {
      console.error('Error cargando datos de administración:', err);
    } finally {
      this.isLoading.set(false);
      if (event) {
        event.target.complete();
      }
    }
  }

  public async onSegmentChange(event: any) {
    this.selectedSegment.set(event.detail.value as ProjectStatus);
  }

  public async toggleSetting(key: keyof ContestSettings, value: boolean) {
    if (!this.settings()) return;

    try {
      const updated = await this.projectService.updateSettings({
        [key]: value,
      });
      this.settings.set(updated);
      this.showToast('Configuración actualizada correctamente.', 'success');
    } catch (err: any) {
      this.showToast('Error al actualizar configuración: ' + err.message, 'danger');
    }
  }

  public async setProjectStatus(project: Project, newStatus: ProjectStatus) {
    try {
      await this.projectService.updateProjectStatus(project.id, newStatus);
      this.projects.update((list) =>
        list.map((p) => (p.id === project.id ? { ...p, status: newStatus } : p))
      );
      const actionText = newStatus === 'approved' ? 'aprobado' : 'rechazado';
      this.showToast(`Proyecto "${project.project_name}" ${actionText}.`, 'success');
    } catch (err: any) {
      this.showToast('Error al actualizar estado del proyecto.', 'danger');
    }
  }

  public async deleteProject(project: Project) {
    if (confirm(`¿Estás seguro de eliminar el proyecto "${project.project_name}"? Esta acción borrará también sus votos asociados.`)) {
      try {
        await this.projectService.deleteProject(project.id);
        this.projects.update((list) => list.filter((p) => p.id !== project.id));
        this.showToast('Proyecto eliminado.', 'medium');
      } catch (err: any) {
        this.showToast('Error al eliminar proyecto.', 'danger');
      }
    }
  }

  public async openPreviewModal(project: Project) {
    const modal = await this.modalCtrl.create({
      component: VideoPlayerModalComponent,
      componentProps: {
        project,
        allowVoting: false,
      },
    });
    await modal.present();
  }

  public async onSignOut() {
    await this.supabaseService.signOut();
    this.showToast('Sesión cerrada con éxito.', 'medium');
    this.router.navigate(['/home']);
  }

  private showToast(message: string, color: string = 'dark') {
    this.toastMessage.set(message);
    this.toastColor.set(color);
    this.isToastOpen.set(true);
  }
}
