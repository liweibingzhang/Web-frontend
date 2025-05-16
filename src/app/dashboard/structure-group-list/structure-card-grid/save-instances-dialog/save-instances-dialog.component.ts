import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { materialModules } from '../../../../shared/material';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-save-instance-dialog',
  standalone: true,
  imports: [...materialModules, FormsModule],
  template: `
    <h2 mat-dialog-title>保存实例</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" class="full-width">
        <mat-label>实例名称</mat-label>
        <input matInput [(ngModel)]="data.name" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">取消</button>
      <button mat-flat-button color="primary" (click)="confirm()">确认</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
  `]
})
export class SaveInstanceDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SaveInstanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { name: string }
  ) {}

  confirm() {
    this.dialogRef.close(this.data.name);
  }
}
