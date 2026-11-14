import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../environments/environment';
import { Api } from './core';
export type DesignType = 'EVENT_TICKET'|'PARKING_TICKET'|'ENTRY_TICKET'|'INVITATION'|'MEMBERSHIP_CARD'|'ID_CARD'|'CUSTOM';
export interface DesignElement { id: string; type: 'text'|'image'|'rectangle'|'circle'|'line'|'qr'|'barcode'|'svg'|'background'; x:number; y:number; [key:string]:unknown }
export interface DesignConfig { version:number; type:DesignType; canvas:{width:number;height:number;unit?:string;background?:string;backgroundImage?:string;backgroundMask?:string}; elements:DesignElement[]; [key:string]:unknown }
export interface Design { id:string; name:string; type:DesignType; width:number; height:number; unit?:string; config:DesignConfig; createdAt?:string; updatedAt?:string }
export interface DesignInput { name:string; type:DesignType; width:number; height:number; unit?:string; config:DesignConfig }
@Injectable({providedIn:'root'}) export class DesignsApi {
 private http=inject(HttpClient); private base=`${environment.apiBaseUrl}/designs`;
 list(search=''){return this.http.get<Api<Design[]>>(this.base,{params:search?{search}:{},withCredentials:true})}
 get(id:string){return this.http.get<Api<Design>>(`${this.base}/${encodeURIComponent(id)}`,{withCredentials:true})}
 generate(input:{prompt:string;type:DesignType;width:number;height:number;unit?:string;designId?:string}){return this.http.post<Api<{config:DesignConfig;model?:string;aiAvailable:boolean;warning?:string}>>(`${this.base}/generate`,input,{withCredentials:true})}
 create(input:DesignInput){return this.http.post<Api<Design>>(this.base,input,{withCredentials:true})}
 update(id:string,input:Partial<DesignInput>){return this.http.patch<Api<Design>>(`${this.base}/${encodeURIComponent(id)}`,input,{withCredentials:true})}
 delete(id:string){return this.http.delete<Api<unknown>>(`${this.base}/${encodeURIComponent(id)}`,{withCredentials:true})}
}
