import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../environments/environment';
export interface User { id: string; name: string; email: string; role: string }
export interface Api<T> { success: boolean; message: string; data: T; errors?: unknown }
const base = environment.apiBaseUrl;
@Injectable({providedIn:'root'}) export class AuthApi {
 private http=inject(HttpClient); private router=inject(Router); user=signal<User|null>(null); ready=signal(false);
 private bootstrapRequest:Promise<void>|null=null;
 bootstrap():Promise<void>{if(this.bootstrapRequest)return this.bootstrapRequest;this.bootstrapRequest=new Promise(resolve=>{this.http.get<Api<User>>(`${base}/auth/me`,{withCredentials:true}).subscribe({next:r=>{this.user.set(r.data);this.ready.set(true);resolve()},error:()=>{this.user.set(null);this.ready.set(true);resolve()}})});return this.bootstrapRequest}
 login(email:string,password:string){return this.http.post<Api<{user:User}>>(`${base}/auth/login`,{email,password},{withCredentials:true}).pipe(tap(r=>this.user.set(r.data.user)))}
 register(name:string,email:string,password:string){return this.http.post<Api<User>>(`${base}/auth/register`,{name,email,password},{withCredentials:true})}
 logout(){return this.http.post<Api<null>>(`${base}/auth/logout`,{},{withCredentials:true}).pipe(catchError(()=>of(null)),tap(()=>{this.user.set(null);this.router.navigateByUrl('/login')}))}
 updateName(name:string){return this.http.patch<Api<User>>(`${base}/auth/profile`,{name},{withCredentials:true}).pipe(tap(r=>this.user.set(r.data)))}
 changePassword(currentPassword:string,newPassword:string){return this.http.patch<Api<unknown>>(`${base}/auth/password`,{currentPassword,newPassword},{withCredentials:true})}
 refresh(){return this.http.post<Api<{user:User}>>(`${base}/auth/refresh`,{},{withCredentials:true}).pipe(tap(r=>this.user.set(r.data.user)))}
}
let refreshing$:Observable<unknown>|null=null;
export const authInterceptor:HttpInterceptorFn=(req,next)=>{const api=inject(AuthApi),router=inject(Router);if(!req.url.startsWith(base))return next(req);const credential=req.clone({withCredentials:true});if(req.url.endsWith('/auth/refresh')||req.url.endsWith('/auth/login')||req.url.endsWith('/auth/register'))return next(credential);return next(credential).pipe(catchError((err:HttpErrorResponse)=>{if(err.status!==401)return throwError(()=>err);if(!refreshing$)refreshing$=api.refresh().pipe(shareReplay(1),finalize(()=>refreshing$=null));return refreshing$.pipe(switchMap(()=>next(credential)),catchError(e=>{api.user.set(null);router.navigateByUrl('/login');return throwError(()=>e)}))}))};
export const authGuard=()=>{const api=inject(AuthApi),router=inject(Router);if(!api.ready())return api.bootstrap().then(()=>api.user()?true:router.createUrlTree(['/login']));return api.user()?true:router.createUrlTree(['/login'])};
export const guestGuard=()=>{const api=inject(AuthApi),router=inject(Router);if(!api.ready())return api.bootstrap().then(()=>api.user()?router.createUrlTree(['/app']):true);return api.user()?router.createUrlTree(['/app']):true};
export function messageOf(e:unknown,fallback:string){const x=e as {error?:{message?:string}};return x?.error?.message||fallback}
