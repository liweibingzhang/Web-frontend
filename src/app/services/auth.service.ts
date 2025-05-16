import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../app.config';
import { User } from '../models/user.model'

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.loggedIn.asObservable();

  private currentUser = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUser.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  // 注册
  register(user: User): Observable<any> {
    return this.http.post(`${environment.apiUrl}/user/register`, user);
  }

  // 登录
  login(user: User): Observable<any> {
    return this.http.post(`${environment.apiUrl}/user/login`, user, { withCredentials: true }).pipe(
      tap(() => {
        this.fetchCurrentUser().subscribe(); // 同步获取用户信息
      })
    );
  }

  // 登出
  logout(): void {
    this.http.post(`${environment.apiUrl}/user/logout`, {}, { withCredentials: true }).subscribe(() => {
      this.loggedIn.next(false);
      this.currentUser.next(null);
      this.router.navigate(['/login']);
    });
  }

  // 获取当前用户
  fetchCurrentUser(): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/user/me`, {}, { withCredentials: true }).pipe(
      tap(user => {
        if("message" in user){
          this.currentUser.next(null);
          this.loggedIn.next(false);
        }else{
          this.currentUser.next(user);
          this.loggedIn.next(true);
        }
      })
    );
  }

  // 页面初始化时检查是否登录
  checkLoginStatus(): void {
    this.fetchCurrentUser().subscribe({
      next: () => {},
      error: () => {
        this.loggedIn.next(false);
      }
    });
  }

  updateCurrentUser(user: User): Observable<any> {
    return this.http.post(`${environment.apiUrl}/user/update`, user, { withCredentials: true }).pipe(
      tap(result => {
        this.checkLoginStatus();
      })
    );
  }

}
