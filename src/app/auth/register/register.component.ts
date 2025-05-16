import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../app.config';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  user = {
    username: '',
    password: '',
    email: '',
    phone: '',
    role_id: '',
    role: ''
  };

  constructor(private http: HttpClient, private router: Router) {}

  register() {
    this.http.post(`${environment.apiUrl}/user/register`, this.user, { responseType: 'text' })
      .subscribe({
        next: res => {
          alert(res);
          this.router.navigate(['/login']);
        },
        error: err => alert(err.error)
      });
  }
}
