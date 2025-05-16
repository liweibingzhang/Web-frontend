import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { materialModules } from '../../../shared/material';
@Component({
  selector: 'app-apply-group-dialog',
  imports: [FormsModule, ReactiveFormsModule, ...materialModules],
  standalone: true,
  templateUrl: './apply-group-dialog.component.html',
  styleUrl: './apply-group-dialog.component.css'
})
export class ApplyGroupDialogComponent {
  groupId: string = '';
  applyReason: string = '';

  constructor(
    public dialogRef: MatDialogRef<ApplyGroupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onApply(): void {
    if (this.groupId.trim()) {
      this.dialogRef.close({
        groupId: this.groupId.trim(),
        applyReason: this.applyReason.trim()
      });
    }
  }
}
