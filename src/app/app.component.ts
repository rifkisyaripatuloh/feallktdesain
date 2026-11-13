import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthApi } from './core';
@Component({selector:'app-root',standalone:true,imports:[RouterOutlet],template:`<router-outlet />`})
export class AppComponent {private auth=inject(AuthApi); constructor(){void this.auth.bootstrap()}}
