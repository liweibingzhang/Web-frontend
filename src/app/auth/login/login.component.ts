import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { environment } from '../../app.config';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  user: User = {role_id: '', password: ''};

  constructor(private http: HttpClient, private router: Router, private authService: AuthService) { }

  login() {
    this.authService.login(this.user).subscribe({
      next: res => {
        alert(res['message']);
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        alert(err.error['message']);
      }
    });
  }

  logout() {
    this.authService.logout()
  }
}
