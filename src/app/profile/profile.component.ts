import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { materialModules } from '../shared/material';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';


@Component({
  selector: 'app-profile',
  imports: [CommonModule, ...materialModules, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  standalone: true
})
export class ProfileComponent {
  user: User | null = null;
  userForm: FormGroup;
  isEditMode = false;

  ngOnInit(){
    this.authService.checkLoginStatus()
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      this.userForm = this.fb.group({
        username: [this.user!.username, Validators.required],
        email: [this.user!.email, [Validators.required, Validators.email]],
        phone: [this.user!.phone],
        role: [this.user!.role],
      });
    })
  }

  constructor(private authService: AuthService, private fb: FormBuilder){
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
    })
  }

  enableEdit(): void {
    this.isEditMode = true;
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.userForm.patchValue(this.user!); // 恢复原数据
  }

  onSubmit() {
    if (this.userForm.valid) {
      const updatedUser: User = { ...this.user, ...this.userForm.value };
      this.authService.updateCurrentUser(updatedUser).subscribe({
        next: (data: any) => {
          alert("更新成功")
        },
        error: (err: any) => {
          alert("更新失败")
        }
      })
      this.isEditMode = false;
    }
  }
}
