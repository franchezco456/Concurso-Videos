import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'inscribir',
    redirectTo: 'register',
    pathMatch: 'full',
  },
  {
    path: 'results',
    loadComponent: () => import('./pages/results/results.page').then((m) => m.ResultsPage),
  },
  {
    path: 'resultados',
    redirectTo: 'results',
    pathMatch: 'full',
  },
  {
    path: 'admin-login',
    loadComponent: () => import('./pages/admin-login/admin-login.page').then((m) => m.AdminLoginPage),
  },
  {
    path: 'admin/login',
    redirectTo: 'admin-login',
    pathMatch: 'full',
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
