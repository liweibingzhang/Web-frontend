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
import { MatSliderModule } from '@angular/material/slider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { InstanceManagerComponent } from '../instance-manager/instance-manager.component';
import { AnimationControllerComponent } from '../animation-controller/animation-controller.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon'; // 添加导入
import { SolutionDialogComponent } from './solution-dialog/solution-dialog.component';


interface StepState {
  row: number;
  col: number;
  action: 'place' | 'remove' | 'backtrack';
  conflicts: [number, number][];
  board: number[][];
  solutions: number[][][];
}


@Component({
  selector: 'app-structure-component-traceback-eightqueens',
  imports: [
    CommonModule, 
    FormsModule, 
    ...materialModules, 
    MatSliderModule, 
    MatExpansionModule, 
    MatTabsModule,
    // InstanceManagerComponent,
    AnimationControllerComponent,
    MatIconModule, // 显式添加 MatIconModule
    // CdkDrag,
    // CdkDropList
  ],
  templateUrl: './structure-component-traceback-eightqueens.component.html',
  styleUrl: './structure-component-traceback-eightqueens.component.css'
})

export class TracebackEightqueensComponent {
  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;
  instances: Instance[] = [];
  items: number[] = [];
  selectedInstance: Instance | null = null;
  selectedJsonconfig: string = '';

  //new
  nValue = 8;
  board: number[][] = [];
  steps: StepState[] = [];
  currentStep = -1;
  solutions: number[][][] = [];
  isAnimating = false;

   // 添加动画控制器引用（假设已正确注入）
  @ViewChild(AnimationControllerComponent) 
  animationController!: AnimationControllerComponent;

  // 添加的startBacktracking方法
  // startBacktracking() {
  //   this.resetState();
  //   this.generateSteps();
    
  //   // 重置动画控制器状态
  //   this.animationController.resetAnimation();
    
  //   // 如果希望自动开始播放
  //   setTimeout(() => {
  //     this.animationController.startAnimation();
  //   }, 100);
  // }
  startBacktracking() {
    this.resetState();
    this.generateSteps(); // 只运行一次

    // 动画控制器启动
    setTimeout(() => {
      this.animationController.resetAnimation();
      // 显式更新棋盘状态
    this.board = Array(this.nValue).fill(0).map(() => Array(this.nValue).fill(0));
      this.animationController.startAnimation();
    }, 100);
  }


   // 初始化棋盘
  initBoard() {
    this.board = Array(this.nValue).fill(0)
      .map(() => Array(this.nValue).fill(0));
    this.resetState();
  }

    resetState() {
    this.board = Array(this.nValue).fill(0).map(() => Array(this.nValue).fill(0));
    this.steps = [];
    this.currentStep = -1;
    this.solutions = [];
    this.isAnimating = false;

     // 强制更新视图
    setTimeout(() => {
      this.board = [...this.board]; // 创建新数组触发变更检测
      //  this.initBoard();      // 重新初始化棋盘
    });
    // this.solutions.push(this.board);
  //    // 强制触发变更检测
  // setTimeout(() => {
  //   this.generateSteps();  // 重新生成步骤
  //   this.initBoard();      // 重新初始化棋盘
  // });
  }

  private createBoard(queens: number[][]): number[][] {
    const newBoard = Array(this.nValue).fill(0)
      .map(() => Array(this.nValue).fill(0));
    queens.forEach(([row, col]) => {
      newBoard[row][col] = 1;
    });
    return newBoard;
  }

  private findConflicts(queens: number[][]): [number, number][] {
    const conflicts: [number, number][] = [];
    const latestQueen = queens[queens.length - 1];
    
    queens.slice(0, -1).forEach(([row, col]) => {
      // 检查同一列
      if (col === latestQueen[1]) {
        conflicts.push([row, col]);
      }
      // 检查对角线
      const rowDiff = Math.abs(row - latestQueen[0]);
      const colDiff = Math.abs(col - latestQueen[1]);
      if (rowDiff === colDiff) {
        conflicts.push([row, col]);
      }
    });
    
    return conflicts;
  }

  // // 修改 generateSteps: 仅运行一次，所有 step 存入 this.steps，不重复运行
  // generateSteps = () => {
  //   this.steps = [];
  //   this.solutions = [];

  //   const solve = (row: number, queens: number[][]) => {
  //     if (row === this.nValue) {
  //       const board = this.createBoard(queens);
  //       this.solutions.push(board);

  //       this.steps.push({
  //         row: -1, col: -1,
  //         action: 'backtrack',
  //         conflicts: [],
  //         board,
  //         solutions: [...this.solutions]
  //       });
  //       return;
  //     }

  //     for (let col = 0; col < this.nValue; col++) {
  //       if (!this.hasConflict(queens, row, col)) {
  //         const newQueens = [...queens, [row, col]];
  //         const newBoard = this.createBoard(newQueens);

  //         this.steps.push({
  //           row, col,
  //           action: 'place',
  //           conflicts: this.findConflicts(newQueens),
  //           board: newBoard,
  //           solutions: [...this.solutions]
  //         });

  //         solve(row + 1, newQueens); // 递归调用下一行

  //         this.steps.push({
  //           row, col,
  //           action: 'remove',
  //           conflicts: [],
  //           board: this.createBoard(queens),
  //           solutions: [...this.solutions]
  //         });
  //       }
  //     }
  //   };

  //   solve(0, []);
  // };

  // 生成回溯步骤
  // generateSteps = () => {
  //   this.steps = [];
  //   this.solutions = [];
  //   // const stack: [number, number[][], Set<string>][] = [[0, [], new Set()]];
  //   const stack: [number, number[][], Set<number>][] = [[0, [], new Set()]]; // 修复类型为Set<number>
  //   while (stack.length > 0) {
  //     const [row, queens, cols] = stack.pop()!;
      
  //     for (let col = 0; col < this.nValue; col++) {
  //       if (!this.hasConflict(queens, row, col)) {
  //         const newQueens = [...queens, [row, col]];
  //         const newBoard = this.createBoard(newQueens);
          
  //         // 记录放置皇后步骤
  //         this.steps.push({
  //           row, col,
  //           action: 'place',
  //           conflicts: this.findConflicts(newQueens),
  //           board: newBoard,
  //           solutions: [...this.solutions]
  //         });

  //         if (row === this.nValue - 1) {
  //           this.solutions.push(newBoard);
  //           this.steps.push({
  //             row: -1, col: -1,
  //             action: 'backtrack',
  //             conflicts: [],
  //             board: newBoard,
  //             solutions: [...this.solutions]
  //           });
  //         } else {
  //           stack.push([row + 1, newQueens, new Set([...cols, col])]);
  //         }
  //       }
  //     }
      
  //     // 记录回溯步骤
  //     if (row > 0) {
  //       this.steps.push({
  //         row, col: -1,
  //         action: 'backtrack',
  //         conflicts: [],
  //         board: this.createBoard(queens),
  //         solutions: [...this.solutions]
  //       });
  //     }
  //   }
  // }
  generateSteps = () => {
  this.steps = [];
  this.solutions = [];

  const solve = (row: number, queens: number[][]) => {
    if (row === this.nValue) {
      const board = this.createBoard(queens);
      this.solutions.push(board);

      this.steps.push({
        row: -1, col: -1,
        action: 'backtrack',
        conflicts: [],
        board,
        solutions: [...this.solutions]
      });
      return;
    }

    for (let col = 0; col < this.nValue; col++) {
      const conflicts = this.findConflicts([...queens, [row, col]]);

      // 即使有冲突，也记录尝试步骤（用于动画显示）
      const tryBoard = this.createBoard([...queens, [row, col]]);
      this.steps.push({
        row, col,
        action: 'place',
        conflicts,
        board: tryBoard,
        solutions: [...this.solutions]
      });

      if (conflicts.length === 0) {
        solve(row + 1, [...queens, [row, col]]);
      }

      // 回溯时记录 remove（撤销该尝试）
      this.steps.push({
        row, col,
        action: 'remove',
        conflicts: [],
        board: this.createBoard(queens),
        solutions: [...this.solutions]
      });
    }
  };

  solve(0, []);
};


  // 冲突检测修复版
  private hasConflict(queens: number[][], row: number, col: number): boolean {
    return queens.some(([qRow, qCol]) =>
      qCol === col ||  // 同列冲突
      Math.abs(qRow - row) === Math.abs(qCol - col) // 对角线冲突
    );
  }


  // 更新状态
  updateState = (step: StepState) => {
    this.board = step.board.map(row => [...row]);
    this.currentStep = this.steps.indexOf(step);
  }

  // 状态判断
  isCurrentStep(row: number, col: number): boolean {
    return this.steps[this.currentStep]?.row === row && 
           this.steps[this.currentStep]?.col === col;
  }

  isConflictCell(row: number, col: number): boolean {
    return this.steps[this.currentStep]?.conflicts.some(
      ([r, c]) => r === row && c === col);
      
  }


  // 打开弹窗显示解决方案
showSolution(solution: number[][], index: number) {
  this.dialog.open(SolutionDialogComponent, {
    data: {
      board: solution,
      solutionNumber: index + 1
    },
    width: '560px',
    maxWidth: '95vw'
  });
}


  ngOnInit(){
    this.initBoard(); // 新增初始化棋盘

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
