import { Injectable } from '@angular/core';

const STORAGE_KEY = 'concurso_device_uuid';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private deviceId: string | null = null;
  private initializationPromise: Promise<string> | null = null;

  constructor() {
    this.cleanLegacyKeys();
    this.initializationPromise = this.resolveDeviceId();
  }

  /**
   * Obtiene el identificador único y persistente del dispositivo.
   */
  public async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }
    this.initializationPromise = this.resolveDeviceId();
    return await this.initializationPromise;
  }

  private async resolveDeviceId(): Promise<string> {
    // 1. Buscar en LocalStorage o Cookie permanente
    let uuid = localStorage.getItem(STORAGE_KEY);
    if (!uuid) {
      uuid = this.getCookie(STORAGE_KEY);
    }

    // 2. Si es la primera vez, generar un UUID fijo e inmutable
    if (!uuid) {
      uuid = this.generateUUID();
    }

    // 3. Persistir en LocalStorage y en Cookie con 1 año de vigencia
    try {
      localStorage.setItem(STORAGE_KEY, uuid);
      this.setCookie(STORAGE_KEY, uuid, 365);
    } catch (e) {
      console.warn('Error al guardar UUID de dispositivo:', e);
    }

    this.deviceId = `dev_${uuid}`;
    return this.deviceId;
  }

  private cleanLegacyKeys(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('concurso_likes_fp_') || key.startsWith('concurso_voted_projects_fp_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
  }

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private setCookie(name: string, value: string, days: number): void {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = 'expires=' + d.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
  }

  private getCookie(name: string): string | null {
    const cname = name + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(cname) === 0) {
        return c.substring(cname.length, c.length);
      }
    }
    return null;
  }
}
