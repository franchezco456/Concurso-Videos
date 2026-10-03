import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonChip,
  IonLabel,
  IonFooter,
  ModalController,
  AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, heart, heartOutline, schoolOutline, peopleOutline, logoYoutube, logoGoogle } from 'ionicons/icons';
import { SafeResourceUrl } from '@angular/platform-browser';
import { Project } from '../../core/models/contest.models';
import { YoutubeService } from '../../core/services/youtube';
import { VoteService } from '../../core/services/vote';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-video-player-modal',
  templateUrl: './video-player-modal.component.html',
  styleUrls: ['./video-player-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonChip,
    IonLabel,
    IonFooter,
  ],
})
export class VideoPlayerModalComponent implements OnInit {
  @Input() project!: Project;
  @Input() allowVoting: boolean = true;

  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private youtubeService = inject(YoutubeService);
  public voteService = inject(VoteService);
  public supabaseService = inject(SupabaseService);

  public safeUrl: SafeResourceUrl | null = null;
  public isToggling = false;

  constructor() {
    addIcons({
      closeOutline,
      heart,
      heartOutline,
      schoolOutline,
      peopleOutline,
      logoYoutube,
      logoGoogle,
    });
  }

  ngOnInit() {
    if (this.project?.youtube_video_id) {
      this.safeUrl = this.youtubeService.getSafeEmbedUrl(this.project.youtube_video_id);
    }
  }

  public dismiss(): void {
    this.modalCtrl.dismiss();
  }

  public isLiked(): boolean {
    return this.voteService.hasLiked(this.project.id);
  }

  public async toggleLike(): Promise<void> {
    if (!this.allowVoting || this.isToggling) return;
    this.isToggling = true;
    try {
      const res = await this.voteService.toggleLike(this.project.id);
      if (res.requiresAuth) {
        await this.promptGoogleLogin();
      }
    } finally {
      this.isToggling = false;
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
            this.supabaseService.signInWithGoogle();
          },
        },
      ],
    });
    await alert.present();
  }
}
