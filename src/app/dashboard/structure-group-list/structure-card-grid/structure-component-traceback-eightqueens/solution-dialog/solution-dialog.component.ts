import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-solution-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  templateUrl: './solution-dialog.component.html',
  styleUrls: ['./solution-dialog.component.css']
})
export class SolutionDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { 
    board: number[][],
    solutionNumber: number 
  }) {}
}
