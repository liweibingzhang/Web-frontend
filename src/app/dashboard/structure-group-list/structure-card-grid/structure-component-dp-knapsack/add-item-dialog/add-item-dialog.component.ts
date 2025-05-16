import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-add-item-dialog',
  template: `
    <h2 mat-dialog-title>添加新物品</h2>

    <mat-dialog-content>
      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>重量</mat-label>
        <input matInput type="number" [(ngModel)]="weight" min="1" required>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width: 100%;">
        <mat-label>价值</mat-label>
        <input matInput type="number" [(ngModel)]="value" min="1" required>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">取消</button>
      <button mat-raised-button color="primary" (click)="onAdd()">添加</button>
    </mat-dialog-actions>
  `,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule
  ]
})
export class AddItemDialogComponent {
  weight: number = 1;
  value: number = 1;

  constructor(private dialogRef: MatDialogRef<AddItemDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onAdd(): void {
    if (this.weight > 0 && this.value > 0) {
      this.dialogRef.close({ weight: this.weight, value: this.value });
    }
  }
}
