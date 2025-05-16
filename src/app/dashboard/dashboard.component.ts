import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { materialModules } from '../shared/material';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-dashboard',
  imports: [
    ...materialModules,
    RouterOutlet
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true
})
export class DashboardComponent {
  user: User | null = null

  ngOnInit(){
    // 检查用户登录状态
    this.authService.checkLoginStatus()
    // 订阅当前用户信息
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    })
  }

  constructor(private router: Router, private authService: AuthService) { }

  goToProfile() {
    this.router.navigate(['/dashboard/profile']);
  }

  navigateTo(path: string) {
    this.router.navigate([`/dashboard/${path}`]);
  }
}
