import { MatDialog } from '@angular/material/dialog';
import { environment } from './../../../app.config';
import { AuthService } from '../../../services/auth.service';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { materialModules } from '../../../shared/material';
import { CommonService } from '../../../services/common.service';
import { Group } from '../../../models/group.model';
import { User } from '../../../models/user.model';
import { MyComponent } from '../../../models/component.model';
import { CommonModule } from '@angular/common';
import { AddComponentDialogComponent } from './add-component-dialog/add-component-dialog.component';

@Component({
  selector: 'app-structure-card-grid',
  imports: [
    CommonModule,
    ...materialModules
  ],
  templateUrl: 'structure-card-grid.component.html',
  styleUrl: 'structure-card-grid.component.css',
  standalone: true
})
export class StructureCardGridComponent {
  user: User | null = null;
  group: Group | null = null;
  components: MyComponent[] = [];
  defaultImg = 'avatar.jpg'
  lengths = 0;
  environment = environment;
  pageNum = 0;

  ngOnInit(){
    this.authService.checkLoginStatus()
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    })

    if(this.user){
      this.commonService.selectGroupById(Number(this.route.snapshot.paramMap.get("groupId")!)).subscribe({
        next: (data: any) => {
          this.group = data;
          this.updateComponent();
        },
        error: (err: any) =>{
          console.log(err.error);
        }
      });
    }
  }

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService, private commonService: CommonService, private dialog: MatDialog) { }

  goToComponent(component: MyComponent) {
    this.router.navigate([component.type, component.id], { relativeTo: this.route });
  }

  updateComponent(){
    this.commonService.selectComponentPageByGroupId(this.group!.id, this.pageNum + 1, environment.componentPageSize).subscribe({
      next: (data: any) => {
        this.components = data['data'];
        this.lengths = data['total'];
      },
      error: (err: any) =>{
        console.log(err.error);
      }
    });
  }

  onPageChange(event: any){
    this.pageNum = event.pageIndex;
    this.commonService.selectComponentPageByGroupId(this.group!.id, event.pageIndex + 1, environment.componentPageSize).subscribe({
      next: (data: any) => {
        this.components = data['data'];
        this.lengths = data['total'];
      },
      error: (err: any) =>{
        console.log(err.error);
      }
    });

  }

  deleteComponent(component: MyComponent){
    this.commonService.deleteComponentById(component.id).subscribe({
      next: (data: any) =>{
        alert("删除成功");
        this.updateComponent();
      }
    })
  }
  addComponent(){
    const dialogRef = this.dialog.open(AddComponentDialogComponent, {
      width: '250px',
      data: { name: "", type: ""}
    })
    dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.commonService.insertComponent({"name": result.name, "type": result.type, "group_id": this.group!.id}).subscribe({
          next: (data: any) =>{
            alert("添加成功");
            this.updateComponent();
          }
        })
      }
    })
  }

}
