import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonProgressBar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  trophyOutline,
  medalOutline,
  ribbonOutline,
  playCircle,
  schoolOutline,
  hourglassOutline,
  arrowBackOutline,
  checkmarkDoneCircleOutline,
  heart,
} from 'ionicons/icons';
import { ContestResult, ContestSettings, Project } from '../../core/models/contest.models';
import { ProjectService } from '../../core/services/project';
import { YoutubeService } from '../../core/services/youtube';
import { VideoPlayerModalComponent } from '../../components/video-player-modal/video-player-modal.component';

@Component({
  selector: 'app-results',
  templateUrl: './results.page.html',
  styleUrls: ['./results.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonProgressBar,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class ResultsPage implements OnInit {
  private projectService = inject(ProjectService);
  public youtubeService = inject(YoutubeService);
  private modalCtrl = inject(ModalController);

  public settings = signal<ContestSettings | null>(null);
  public results = signal<ContestResult[]>([]);
  public isLoading = signal<boolean>(true);

  public totalVotesCast = computed(() => {
    return this.results().reduce((acc, curr) => acc + curr.total_votes, 0);
  });

  public topThree = computed(() => {
    const list = this.results();
    if (list.length === 0) return [];
    if (this.totalVotesCast() === 0) {
      return list.slice(0, 3);
    }
    // Incluir todos los proyectos que lograron puesto de podio (1º, 2º o 3º lugar)
    const podiumList = list.filter((r) => (r.rank ?? 99) <= 3);
    return podiumList.length > 0 ? podiumList : list.slice(0, 3);
  });

  public remainingRankings = computed(() => {
    const podiumIds = new Set(this.topThree().map((p) => p.project_id));
    return this.results().filter((r) => !podiumIds.has(r.project_id));
  });

  constructor() {
    addIcons({
      trophyOutline,
      medalOutline,
      ribbonOutline,
      playCircle,
      schoolOutline,
      hourglassOutline,
      arrowBackOutline,
      checkmarkDoneCircleOutline,
      heart,
    });
  }

  async ngOnInit() {
    await this.loadResults();
  }

  public async loadResults(event?: any) {
    this.isLoading.set(true);
    try {
      const settingsData = await this.projectService.getSettings();
      this.settings.set(settingsData);

      if (settingsData.are_results_public) {
        const resultsData = await this.projectService.getResults();
        this.results.set(resultsData);
      }
    } catch (err) {
      console.error('Error al cargar resultados:', err);
    } finally {
      this.isLoading.set(false);
      if (event) {
        event.target.complete();
      }
    }
  }

  public async openVideoModal(result: ContestResult) {
    const project: Project = {
      id: result.project_id,
      school_name: result.school_name,
      project_name: result.project_name,
      youtube_url: result.youtube_url,
      youtube_video_id: result.youtube_video_id,
      members: result.members,
      status: 'approved',
      total_likes: result.total_votes,
    };

    const modal = await this.modalCtrl.create({
      component: VideoPlayerModalComponent,
      componentProps: {
        project,
        allowVoting: false,
      },
      cssClass: 'video-modal-custom',
    });
    await modal.present();
  }
}
