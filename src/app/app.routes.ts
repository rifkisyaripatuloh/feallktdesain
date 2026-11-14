import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core';
import { LoginComponent, RegisterComponent, DashboardComponent, ProfileComponent } from './page-exports';
import { DesignsListComponent, TicketEditorComponent } from './design-pages';
export const routes: Routes = [
 { path:'', pathMatch:'full', redirectTo:'app/designs' },
 { path:'login', component:LoginComponent, canActivate:[guestGuard], title:'Masuk · TicketForge' },
 { path:'register', component:RegisterComponent, canActivate:[guestGuard], title:'Buat akun · TicketForge' },
 { path:'app', component:DashboardComponent, canActivate:[authGuard], title:'Dashboard · TicketForge' },
 { path:'app/designs', component:DesignsListComponent, canActivate:[authGuard], title:'Desain tiket · TicketForge' },
 { path:'app/designs/:id/edit', component:TicketEditorComponent, canActivate:[authGuard], title:'Editor desain · TicketForge' },
 { path:'app/profile', component:ProfileComponent, canActivate:[authGuard], title:'Profil · TicketForge' },
 { path:'**', redirectTo:'app/designs' }
];
