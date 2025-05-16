import { environment } from './../../app.config';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { CommonService } from '../../services/common.service';
import { CommonModule } from '@angular/common';
import { materialModules } from '../../shared/material';
import { AuthService } from '../../services/auth.service';
import { MatTableModule } from '@angular/material/table';


@Component({
  selector: 'app-apply-review',
  imports: [CommonModule, ...materialModules, MatTableModule],
  templateUrl: './apply-review.component.html',
  styleUrls: ['./apply-review.component.css']
})
export class ApplyReviewComponent implements OnInit {
  displayedColumns: string[] = ['group_id', 'apply_reason', 'status', 'created_at', 'reviewed_at', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  length = 0;
  pageSize = environment.myApplyPageSize;
  pageNum = 0;
  environment = environment;
  user: any;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private commonService: CommonService, private authService: AuthService) { }

  ngOnInit(): void {
    // 检查用户登录状态
    this.authService.checkLoginStatus()
    // 订阅当前用户信息
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      this.updateApply()
    })

  }

  updateApply(): void {
    this.commonService.selectGroupPermissionPageByOwnerIdAndStatus(this.user.id, 'all', this.pageNum + 1, this.pageSize).subscribe({
      next: (res: any) => {
        this.dataSource = new MatTableDataSource<any>(res.data);
        this.length = res.total;
      },
      error: (err: any) =>{
        console.log(err);
      }
    })
  }

  onPageChange(event: PageEvent) {
    this.pageNum = event.pageIndex;
    this.updateApply();
  }

  approve(apply: any) {
    this.commonService.updateGroupPermissionStatus(apply.id, 'approved').subscribe({
      next: (res: any) => {
        alert('已批准')
        this.updateApply();
      },
      error: (err: any) => {
        console.log(err);
      }
    });
  }

  reject(apply: any) {
    this.commonService.updateGroupPermissionStatus(apply.id, 'rejected').subscribe({
      next: (res: any) => {
        alert('已拒绝')
        this.updateApply();
      },
      error: (err: any) => {
        console.log(err);
      }
    })
  }
}
