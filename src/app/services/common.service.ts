import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../app.config';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  constructor(private http: HttpClient, private router: Router) {}
  selectGroupPageByUserId(userId: number, pageNum: number, pageSize: number): Observable<any> {
    const params = new HttpParams()
    .set('userId', userId)
    .set('pageSize', pageSize)
    .set('pageNum', pageNum);
    return this.http.get(`${environment.apiUrl}/group/selectPageByUserId`, {params});
  }

  selectGroupById(groupId: number): Observable<any> {
    const params = new HttpParams()
    .set('id', groupId);
    return this.http.get(`${environment.apiUrl}/group/selectById`, {params});
  }

  insertGroup(group: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/group/insert`, group);
  }

  deleteGroupById(groupId: number): Observable<any> {
    const params = new HttpParams()
    .set('id', groupId);
    return this.http.delete(`${environment.apiUrl}/group/delete`, {params});
  }

  selectComponentPageByGroupId(groupId: number, pageNum: number, pageSize: number): Observable<any> {
    const params = new HttpParams()
    .set('groupId', groupId)
    .set('pageSize', pageSize)
    .set('pageNum', pageNum);
    return this.http.get(`${environment.apiUrl}/component/selectPageByGroupId`, {params});
  }

  selectComponentById(componentId: number): Observable<any> {
    const params = new HttpParams()
    .set('id', componentId);
    return this.http.get(`${environment.apiUrl}/component/selectById`, {params});
  }

  insertComponent(component: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/component/insert`, component);
  }

  deleteComponentById(componentId: number): Observable<any> {
    const params = new HttpParams()
    .set('id', componentId);
    return this.http.delete(`${environment.apiUrl}/component/delete`, {params});
  }

  selectInstanceByComponentId(componentId: number): Observable<any> {
    const params = new HttpParams()
    .set('componentId', componentId);
    return this.http.get(`${environment.apiUrl}/instance/selectByComponentId`, {params});
  }

  insertInstance(instance: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/instance/insert`, instance);
  }

  deleteInstanceById(instanceId: number): Observable<any> {
    const params = new HttpParams()
    .set('id', instanceId);
    return this.http.delete(`${environment.apiUrl}/instance/delete`, {params});
  }

  insertGroupApply(groupApply: any){
    return this.http.post(`${environment.apiUrl}/group/insertGroupApply`, groupApply);
  }

  selectGroupPermissionPageByUserIdAndStatus(userId: number, status: string, pageNum: number, pageSize: number): Observable<any> {
    const params = new HttpParams()
    .set('userId', userId)
    .set('status', status)
    .set('pageSize', pageSize)
    .set('pageNum', pageNum);
    return this.http.get(`${environment.apiUrl}/group/selectGroupPermissionPageByUserIdAndStatus`, {params});
  }

  selectGroupPermissionPageByOwnerIdAndStatus(owner_id: number, status: string, pageNum: number, pageSize: number): Observable<any> {
    const params = new HttpParams()
    .set('ownerId', owner_id)
    .set('status', status)
    .set('pageSize', pageSize)
    .set('pageNum', pageNum);
    return this.http.get(`${environment.apiUrl}/group/selectGroupPermissionPageByOwnerIdAndStatus`, {params});
  }

  updateGroupPermissionStatus(groupPermissionId: number, status: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/group/updateGroupApplyStatus`, {"id": groupPermissionId, "status": status});
  }
}
