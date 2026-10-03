import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class YoutubeService {
  private sanitizer = inject(DomSanitizer);

  /**
   * Extrae el ID del video de YouTube a partir de diversas variantes de URL:
   * - https://www.youtube.com/watch?v=VIDEO_ID
   * - https://youtu.be/VIDEO_ID
   * - https://www.youtube.com/shorts/VIDEO_ID
   * - https://www.youtube.com/embed/VIDEO_ID
   */
  public extractVideoId(url: string): string | null {
    if (!url) return null;
    const cleanUrl = url.trim();

    // Patrón regex universal para YouTube
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = cleanUrl.match(regex);

    if (match && match[1]) {
      return match[1];
    }

    // Si ya es un ID directo de 11 caracteres alfanuméricos
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
      return cleanUrl;
    }

    return null;
  }

  /**
   * Obtiene la URL de la miniatura oficial en alta calidad.
   */
  public getThumbnailUrl(videoId: string): string {
    if (!videoId) return '';
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  /**
   * Genera una URL de embed segura para usar en un iframe.
   */
  public getSafeEmbedUrl(videoId: string, autoplay: boolean = true): SafeResourceUrl {
    const autoParam = autoplay ? '1' : '0';
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoParam}&rel=0&modestbranding=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  /**
   * Valida si un texto es un enlace válido de YouTube.
   */
  public isValidYoutubeUrl(url: string): boolean {
    return this.extractVideoId(url) !== null;
  }
}
