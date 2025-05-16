import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { materialModules } from './shared/material';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { VideoRoomComponent } from './video-room/video-room.component';
import { User } from './models/user.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink,  ...materialModules, CommonModule, VideoRoomComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Data-Struct-Ed';
  isLoggedIn = false;
  user: User | null = null;
  showVideoRoom = false;

  constructor(private router: Router, private http: HttpClient, private authService: AuthService){}

  ngOnInit(){
    this.authService.checkLoginStatus()
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
      if(this.isLoggedIn){
        if(this.router.url === '/login'){
          this.navigateTo('dashboard');
        }
      }else{
        this.navigateTo('login')
      }
    })
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      // console.log(this.user)
    })
  }

  logout(){
    this.authService.logout();
  }

  navigateTo(path: string) {
    this.router.navigate([`/${path}`]);
  }

  openVideoRoom() {
    this.showVideoRoom = true;
  }
}
