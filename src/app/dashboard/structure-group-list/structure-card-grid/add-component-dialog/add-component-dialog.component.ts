import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { materialModules } from '../../../../shared/material';
import { environment } from '../../../../app.config';
@Component({
  selector: 'app-add-component-dialog',
  templateUrl: './add-component-dialog.component.html',
  imports: [...materialModules, CommonModule, FormsModule, ReactiveFormsModule],
  styleUrl: './add-component.component.css'
})
export class AddComponentDialogComponent {
  form: FormGroup;
  typeOptions = environment.typeOptions;

  constructor(
    public dialogRef: MatDialogRef<AddComponentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
