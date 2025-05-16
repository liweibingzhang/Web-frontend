import { environment } from './../../../app.config';
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { materialModules } from '../../../shared/material';
import { MatTableModule } from '@angular/material/table';
import { CommonService } from '../../../services/common.service';

@Component({
  selector: 'app-my-apply-dialog',
  imports: [CommonModule, ...materialModules, MatTableModule],
  templateUrl: './my-apply-dialog.component.html',
  styleUrl: './my-apply-dialog.component.css'
})
export class MyApplicationsDialogComponent implements OnInit {
  displayedColumns: string[] = ['group_id', 'apply_reason', 'status', 'created_at', 'reviewed_at'];
  dataSource!: MatTableDataSource<any>;
  applications: any[] = [];
  pageNum = 0;
  length = 0;
  environment = environment;


  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    public dialogRef: MatDialogRef<MyApplicationsDialogComponent>,
    private commonService: CommonService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  updateApplications(){
    this.commonService.selectGroupPermissionPageByUserIdAndStatus(this.data.userId, "all", this.pageNum + 1, environment.myApplyPageSize).subscribe({
      next: (res: any) => {
        this.applications = res['data'];
        this.length = res['total'];
        this.dataSource = new MatTableDataSource(this.applications);
      }
    })

  }

  ngOnInit(): void {
    this.updateApplications();
  }

  onPageChange(event: any) {
    this.pageNum = event.pageIndex;
    this.updateApplications();
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
