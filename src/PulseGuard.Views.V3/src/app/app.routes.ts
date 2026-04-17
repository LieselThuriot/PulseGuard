import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

@Component({ template: '', standalone: true })
class DetailRouteComponent {}

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    children: [
      { path: 'details/:id', component: DetailRouteComponent },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/admin/admin.component').then((m) => m.AdminComponent),
      },
      {
        path: 'pulse-editor',
        loadComponent: () => import('./pages/admin/pulse-editor/pulse-editor.component').then((m) => m.PulseEditorComponent),
      },
      {
        path: 'agent-editor',
        loadComponent: () => import('./pages/admin/agent-editor/agent-editor.component').then((m) => m.AgentEditorComponent),
      },
      {
        path: 'webhook-editor',
        loadComponent: () => import('./pages/admin/webhook-editor/webhook-editor.component').then((m) => m.WebhookEditorComponent),
      },
      {
        path: 'user-editor',
        loadComponent: () => import('./pages/admin/user-editor/user-editor.component').then((m) => m.UserEditorComponent),
      },
      {
        path: 'credential-editor',
        loadComponent: () => import('./pages/admin/credential-editor/credential-editor.component').then((m) => m.CredentialEditorComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
