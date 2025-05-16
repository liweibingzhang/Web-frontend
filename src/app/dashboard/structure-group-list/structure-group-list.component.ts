import { MyApplicationsDialogComponent } from './my-apply-dialog/my-apply-dialog.component';
import { ProfileComponent } from './../../profile/profile.component';
import { environment } from './../../app.config';
import { Component } from "@angular/core";
import { materialModules } from "../../shared/material";
import { CommonModule } from "@angular/common";
import { Group } from "../../models/group.model";
import { User } from "../../models/user.model";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { HttpClient } from "@angular/common/http";
import { CommonService } from "../../services/common.service";
import { AddGroupDialogComponent } from './add-group-dialog/add-group-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ApplyGroupDialogComponent } from './apply-group-dialog/apply-group-dialog.component';

@Component({
  selector: 'app-structure-group-list',
  imports: [...materialModules, CommonModule],
  templateUrl: 'structure-group-list.component.html',
  styleUrl: 'structure-group-list.component.css',
  standalone: true
})
export class StructureGroupListComponent {
  groups: Group[] = [];
  lengths = 0;
  user: User | null = null;
  defaultImg = 'avatar.jpg'
  environment = environment;
  pageNum = 0;

  ngOnInit(){
    this.authService.checkLoginStatus()
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (this.user) {
        this.updateGroup()
      }
    })
  }


  constructor(private router: Router, private route: ActivatedRoute, private authService: AuthService, private http: HttpClient, private commonService: CommonService, private dialog: MatDialog) { }

  updateGroup(){
    this.commonService.selectGroupPageByUserId(this.user!.id!, this.pageNum+1, environment.groupPageSize).subscribe({
      next: (data: any) => {
        this.groups = data['data'];
        this.lengths = data['total']
      },
      error: (err: any) => {
        alert(err.error);
      }
    });
  }

  goToGroup(group: Group) {
    this.router.navigate([group.id], { relativeTo: this.route });
  }

  onPageChange(event: any) {
    this.pageNum = event.pageIndex;
    this.commonService.selectGroupPageByUserId(this.user!.id!, event.pageIndex + 1, environment.groupPageSize).subscribe({
      next: (data: any) => {
        this.groups = data['data'];
      }
    })
  }

  addGroup(){
    const dialogRef = this.dialog.open(AddGroupDialogComponent, {
      width: '250px',
      data: {name: '', description: ''} // 初始数据
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.commonService.insertGroup({"name": result.name, "description": result.description, "owner_id": this.user!.id}).subscribe({
          next: (data: any) => {
            alert("添加成功");
            this.updateGroup();
          },
          error: (err: any) => {
            alert(err.error);
          }
        })
      }
    })
  }

  deleteGroup(group: any){
    this.commonService.deleteGroupById(group.id).subscribe({
      next: (data: any) => {
        alert("删除成功");
        this.updateGroup();
      },
      error: (err: any) => {
        alert(err.error);
      }
    });
  }

  applyGroup(){
    const dialogRef = this.dialog.open(ApplyGroupDialogComponent, {
      data: {groupId: '', applyReason: ''} // 初始数据
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.commonService.insertGroupApply({"group_id": result.groupId, "user_id": this.user!.id, "apply_reason": result.applyReason}).subscribe({
          next: (data: any) => {
            alert("已发送申请");
          },
          error: (err: any) => {
            alert(err.error);
          }
        })
      }
    });
  }

  showMyApply(){
    const dialogRef = this.dialog.open(MyApplicationsDialogComponent,{
      data: {userId: this.user!.id}
    });

    dialogRef.afterClosed().subscribe();
  }


}
