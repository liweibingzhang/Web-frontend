import { Instance } from './../../../../models/instance.model';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../../services/auth.service';
import { MyComponent } from '../../../../models/component.model';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonService } from '../../../../services/common.service';
import { User } from '../../../../models/user.model';
import { environment } from '../../../../app.config';
import { Group } from '../../../../models/group.model';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { materialModules } from '../../../../shared/material';
import { SaveInstanceDialogComponent } from '../save-instances-dialog/save-instances-dialog.component';
import { FormsModule } from '@angular/forms';
import { AiDialogComponent } from '../../../ai-dialog/ai-dialog.components';
@Component({
  selector: 'app-structure-component-list',
  imports: [CommonModule, ...materialModules, FormsModule],
  templateUrl: 'structure-component-list.component.html',
  styleUrls: ['structure-component-list.component.css'],
  standalone: true
})
export class StructureItemDetailComponent {
  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;
  instances: Instance[] = [];
  items: number[] = [];
  selectedInstance: Instance | null = null;
  selectedJsonconfig: string = '';

  ngOnInit(){
    this.authService.checkLoginStatus()
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    })
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if(this.user == null){
        this.router.navigate(['/login']);
      }else{
        const groupId = this.route.snapshot.paramMap.get("groupId");
        this.commonService.selectGroupById(Number(groupId)).subscribe({
          next: (data: any) => {
            this.group = data;
          },
          error: (err: any) =>{
            console.log(err.error);
          }
        })
        const componentId = this.route.snapshot.paramMap.get("componentId");
        this.commonService.selectComponentById(Number(componentId)).subscribe({
          next: (data: any) => {
            this.component = data;
          },
          error: (err: any) =>{
            console.log(err.error);
          }
        })

        this.updateInstances();
      }
    })


  }

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService, private commonService: CommonService, private dialog: MatDialog) { }

  updateInstances(){
    const componentId = this.route.snapshot.paramMap.get("componentId");
    this.commonService.selectInstanceByComponentId(Number(componentId)).subscribe({
      next: (data: any) => {
        console.log(data);
        this.instances = data;
        this.instances.unshift({'name': 'default-instance', 'config': '[1, 2, 3, 4, 5]'})
        this.selectedInstance = this.instances[0];
        this.items = JSON.parse(this.instances[0]['config']);
        this.selectedJsonconfig = this.instances[0]['config'];
      },
      error: (err: any) =>{
        console.log(err.error);
      }
    });
  }

  saveInstance(){
    const dialogRef = this.dialog.open(SaveInstanceDialogComponent, {
      width: '300px',
      data: { name: '' }
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      if (result) {
        const insertedInstance = {"component_id": this.component!['id'], "name": result, "config": this.selectedInstance!['config']};
        this.commonService.insertInstance(insertedInstance).subscribe({
          next: (data: any) =>{
            alert('保存成功');
            this.updateInstances();
          },
          error: (err: any) =>{
            alert('保存失败');
          }
        }
        )
      }
    });
  }

  exportInstance(){
    const dataToExport = JSON.parse(this.selectedJsonconfig);

    const json = JSON.stringify(dataToExport, null, 2); // 格式化
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedInstance!['name']}.json`;
    a.click();

    URL.revokeObjectURL(url); // 清理资源
  }

  aiHelper(){
    const dialogRef = this.dialog.open(AiDialogComponent, {
      width: '300px',
      data: { }
    });
  }

  onConfigChange(){
    try {
      JSON.parse(this.selectedJsonconfig);
      this.selectedInstance!.config = this.selectedJsonconfig;
      this.items = JSON.parse(this.selectedJsonconfig);
    } catch (e) {
      console.error('无效的 JSON 格式:', e);
    }
  }

  onInstanceChange(event: any){
    this.items = JSON.parse(this.selectedInstance!['config']);
    this.selectedJsonconfig = this.selectedInstance!['config'];
  }

  deleteInstance(instance: any){
    if('id' in instance){
      this.commonService.deleteInstanceById(instance['id']).subscribe({
        next: (data: any) =>{
          alert('删除成功');
          this.updateInstances();
        },
        error: (err: any) =>{
          alert('删除失败');
        }
      });
    }else{
      alert('不能删除默认实例');
    }
  }
}
