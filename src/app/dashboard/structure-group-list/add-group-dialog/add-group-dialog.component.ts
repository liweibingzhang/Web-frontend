import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { materialModules } from '../../../shared/material';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-group-dialog',
  imports: [CommonModule, ...materialModules, FormsModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './add-group-dialog.component.html',
})
export class AddGroupDialogComponent {
  groupForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddGroupDialogComponent>
  ) {
    this.groupForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.groupForm.valid) {
      this.dialogRef.close(this.groupForm.value);
    }
  }
}
