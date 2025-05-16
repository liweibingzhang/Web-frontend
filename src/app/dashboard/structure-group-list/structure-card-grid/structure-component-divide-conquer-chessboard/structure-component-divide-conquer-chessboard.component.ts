import { Instance } from './../../../../models/instance.model';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../../services/auth.service';
import { MyComponent } from '../../../../models/component.model';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonService } from '../../../../services/common.service';
import { User } from '../../../../models/user.model';
import { environment } from '../../../../app.config';
import { Group } from '../../../../models/group.model';
import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { materialModules } from '../../../../shared/material';
import { SaveInstanceDialogComponent } from '../save-instances-dialog/save-instances-dialog.component';
import { FormsModule } from '@angular/forms';
import { AiDialogComponent } from '../../../ai-dialog/ai-dialog.components';
import { AnimationControllerComponent } from '../animation-controller/animation-controller.component';
import { MatSliderModule } from '@angular/material/slider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { InstanceManagerComponent } from '../instance-manager/instance-manager.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon'; // 添加导入


interface ChessStep {
  type: 'partition' | 'cover';
  area: { x: number, y: number, size: number };
  tilePositions?: [number, number][];
  specialPos?: [number, number];
  level: number;
}

@Component({
  selector: 'app-structure-component-divide-conquer-chessboard',
  imports: [
    CommonModule, 
    FormsModule, 
    ...materialModules, 
    MatSliderModule, 
    MatExpansionModule, 
    MatTabsModule,
    // InstanceManagerComponent,
    // AnimationControllerComponent,
    MatIconModule, // 显式添加 MatIconModule
    // CdkDrag,
    // CdkDropList
  ],
 templateUrl: './structure-component-divide-conquer-chessboard.component.html',
  styleUrl: './structure-component-divide-conquer-chessboard.component.css',
  standalone: true
})
export class DivideConquerChessboardComponent {
  @ViewChild(AnimationControllerComponent) animationController!: AnimationControllerComponent;
  
  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;
  instances: Instance[] = [];
  items: number[] = [];
  selectedInstance: Instance | null = null;
  selectedJsonconfig: string = '';

  boardSize = 4; // 2^n
  board: number[][] = [];
  steps: ChessStep[] = [];
  currentStep = -1;
  tileColors = ['#FFB74D', '#4DB6AC', '#7986CB', '#E57373'];
  currentLevel = 0;

  // 在DivideConquerChessboardComponent中
// @Output() updateAnimationSteps = new EventEmitter<ChessStep>();

// 修改updateBoard方法
updateBoard(step: ChessStep) {
  if (step.type === 'cover') {
    step.tilePositions?.forEach(([x, y]) => {
      this.board[x][y] = step.level + 1;
    });
  }
  // this.updateAnimationSteps.emit(step); // 发射事件
}

  initBoard() {
    const size = Math.pow(2, this.boardSize);
    this.board = Array(size).fill(0).map(() => Array(size).fill(0));
    this.generateSteps();
  }

  generateSteps() {
    this.steps = [];
    this.divideAndCover(0, 0, Math.pow(2, this.boardSize), 
    { x: 0, y: 0 }, 0);
  }

    private divideAndCover(x: number, y: number, size: number, 
                       special: { x: number, y: number }, level: number) {
    if (size === 2) {
      this.coverTile(x, y, special, level);
      return;
    }

    const half = size / 2;
    const newSpecial = [
      { x: x + half - 1, y: y + half - 1 },
      { x: x + half, y: y + half - 1 },
      { x: x + half - 1, y: y + half },
      { x: x + half, y: y + half }
    ];

    this.steps.push({
      type: 'partition',
      area: { x, y, size },
      level,
      specialPos: [special.x, special.y]
    });

    for (let i = 0; i < 4; i++) {
      const dx = i % 2;
      const dy = Math.floor(i / 2);
      if (x + dx*half <= special.x && special.x < x + (dx+1)*half &&
          y + dy*half <= special.y && special.y < y + (dy+1)*half) {
        this.divideAndCover(x + dx*half, y + dy*half, half, special, level+1);
      } else {
        this.divideAndCover(x + dx*half, y + dy*half, half, newSpecial[i], level+1);
      }
    }
  }

  private coverTile(x: number, y: number, 
                   special: { x: number, y: number }, level: number) {
    const positions: [number, number][] = [];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        if (x + i !== special.x || y + j !== special.y) {
          positions.push([x + i, y + j]);
        }
      }
    }
    
    this.steps.push({
      type: 'cover',
      area: { x, y, size: 2 },
      tilePositions: positions,
      level,
      specialPos: [special.x, special.y]
    });
  }

  // updateBoard(step: ChessStep) {
  //   if (step.type === 'cover') {
  //     step.tilePositions?.forEach(([x, y]) => {
  //       this.board[x][y] = step.level + 1;
  //     });
  //   }
  // }

  startVisualization() {
    this.animationController.resetAnimation();
    setTimeout(() => {
      this.animationController.startAnimation();
    }, 100);
  }


  ngOnInit(){
    this.initBoard();

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

