import './app/design-styles';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import './app/font-families';
bootstrapApplication(AppComponent, appConfig).catch(console.error);
