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
import { AddItemDialogComponent } from './add-item-dialog/add-item-dialog.component'; // 路径按实际项目调整
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

// 在类顶部添加以下接口和变量
interface Item {
  weight: number;
  value: number;
}
// 在knapsack.component.ts中添加状态跟踪
interface DPState {
  step: number;
  i: number;       // 当前物品索引
  w: number;       // 当前容量
  value: number;   // 当前单元格值
  selected: boolean;
  selectedItems: number[];
  remainingCapacity: number;
}

@Component({
  selector: 'app-structure-component-dp-knapsack',
    imports: [
    CommonModule, 
    FormsModule, 
    ...materialModules, 
    MatSliderModule, 
    MatExpansionModule, 
    MatTabsModule,
    // InstanceManagerComponent,
    AnimationControllerComponent,
    CdkDrag,
    CdkDropList
  ],
  templateUrl: 'structure-component-dp-knapsack.component.html',
  styleUrls: ['structure-component-dp-knapsack.component.css'],
  standalone: true
})



export class KnapsackComponent {
  //类的成员变量
  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;
  instances: Instance[] = [];
  items: Item[] = [];
  selectedInstance: Instance | null = null;
  selectedJsonconfig: string = '';
  // 新增状态变量
  dpSteps: DPState[] = [];
  dpTable: number[][] = [];
  currentStep: number = -1;
  highlightedCell: {i: number, w: number} = {i: -1, w: -1};
  selectedItems: number[] = [];
  selectedCapacity: number = 10;
  capacityRange: number[] = [];
  //回溯
  finalSelectedItems: number[] = [];
  previousCell: {i: number, w: number} = {i: -1, w: -1};
  // 新增最优路径单元格数组
  optimalPathCells: { i: number; w: number }[] = [];
  showOptimalPath: boolean = false;

   // 计算属性
  // get remainingCapacity(): number {
  //   return this.dpSteps[this.currentStep]?.remainingCapacity || 0;
  // }
  get remainingCapacity(): number {
  return this.dpSteps[this.currentStep]?.remainingCapacity || this.selectedCapacity;
}

  get currentValue(): number {
    return this.dpSteps[this.currentStep]?.value || 0;
  }

  get totalValue(): number {
    return this.dpTable[this.items.length]?.[this.selectedCapacity] || 0;
  }
  onItemDropped(event: CdkDragDrop<Item[]>) {
    moveItemInArray(this.items, event.previousIndex, event.currentIndex);
    this.selectedJsonconfig = JSON.stringify(this.items, null, 2);
    this.onConfigChange();
    this.generateDPSteps();
  }

  // // 样式判断方法
  // isCurrentCell(i: number, w: number): boolean {
  //   return this.highlightedCell.i === i && 
  //          this.highlightedCell.w === w;
  // }

  // isOptimalPath(i: number, w: number): boolean {
  //   return this.selectedItems.includes(i-1) && 
  //          w === this.dpSteps[this.currentStep]?.w;
  // }
  // 修改 isOptimalPath 方法，匹配调整后的行索引
  isOptimalPath(i: number, w: number): boolean {
    // 注意：i 现在从1开始（对应原i=1的物品0）
    return this.selectedItems.includes(i-1) && 
          w === this.dpSteps[this.currentStep]?.w;
  }


  // 生命周期钩子
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
    this.route.params.subscribe(() => {
      this.generateCapacityRange();
      // 初始化矩阵显示
        // this.generateCapacityRange();
        this.generateDPSteps();
        this.resetDPState();
    });

  }

  //类的构造函数
  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService, private commonService: CommonService, private dialog: MatDialog,private snackBar: MatSnackBar) { }

  // 在KnapsackComponent类中添加方法
  onCapacityChange() {
    // 验证输入有效性
    if (this.selectedCapacity < 1) {
      this.selectedCapacity = 1;
    }
    this.generateCapacityRange();
    this.resetDPState();
    
    // 如果已有物品配置，重新生成步骤
    if (this.items.length > 0) {
      this.generateDPSteps();
    }
  }
  private generateCapacityRange() {
    this.capacityRange = Array.from(
      {length: this.selectedCapacity + 1}, 
      (_, i) => i
    );
  }



  generateDPSteps = () => {
  this.resetDPState();
  const items = JSON.parse(this.selectedJsonconfig);
  const capacity = this.selectedCapacity;

  // 生成容量范围数组
  this.capacityRange = Array.from({ length: capacity + 1 }, (_, i) => i);

  // 初始化DP表
  const dp = Array(items.length + 1)
    .fill(0)
    .map(() => Array(capacity + 1).fill(0));
    

  const steps: DPState[] = [];

  for (let i = 1; i <= items.length; i++) {
    for (let w = 0; w <= capacity; w++) {
      const currentItem = items[i - 1];
      const include = currentItem.weight <= w ? currentItem.value + dp[i - 1][w - currentItem.weight] : 0;
      const exclude = dp[i - 1][w];

      steps.push({
        step: steps.length,
        i: i,
        w: w,
        selected: include > exclude,
        value: Math.max(include, exclude),
        selectedItems: [],
        remainingCapacity: capacity - w
      });

      dp[i][w] = Math.max(include, exclude);
    }
  }

  // 回溯最优路径
  let w = capacity;
  const selectedItems = [];
  this.optimalPathCells = []; // 清空最优路径单元格数组
  for (let i = items.length; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selectedItems.push(i - 1);
      w -= items[i - 1].weight;
       // 记录最优路径上的单元格（包括被选中的单元格）
      this.optimalPathCells.push({ i: i, w: w + items[i - 1].weight }); // 修正w的值
    }


    // 只在必要时添加步骤
  if (i > 0) {
   
  // if (i === items.length || dp[i][w] !== dp[i+1][w]) {
    steps.push({
      step: steps.length,
      i: i,
      w: w,
      selected: false,
      value: this.totalValue,
      selectedItems: [...selectedItems],
      remainingCapacity: capacity - w
    });
  }
  }
  // 反转数组以保证正确的顺序
  this.optimalPathCells.reverse();

  this.dpSteps = steps;
}

 // 判断是否是最优路径上的单元格
  isOptimalCell(i: number, w: number): boolean {
  return this.showOptimalPath && 
         this.optimalPathCells.some(cell => cell.i === i && cell.w === w);
}

// generateDPSteps = () => {
//   this.resetDPState();
//   const items = JSON.parse(this.selectedJsonconfig);
//   // const items = this.items;
//   const capacity = this.selectedCapacity;

//   // 生成容量范围数组
//     this.capacityRange = Array.from({length: capacity+1}, (_, i) => i);
  
//   // 初始化DP表
//   const dp = Array(items.length+1).fill(0)
//                .map(() => Array(capacity+1).fill(0));

//   const steps: DPState[] = [];
  
//   for (let i = 1; i <= items.length; i++) {
//     for (let w = 1; w <= capacity; w++) {
//       const currentItem = items[i-1];
//       const include = (currentItem.weight <= w) 
//         ? currentItem.value + dp[i-1][w-currentItem.weight]
//         : 0;
//       const exclude = dp[i-1][w];
      
//       // 记录步骤
//       steps.push({
//         step: steps.length,
//         i: i,
//         w: w,
//         selected: include > exclude,
//         value: Math.max(include, exclude),
//         selectedItems: [],
//         remainingCapacity: capacity - w
//       });

      
//       dp[i][w] = Math.max(include, exclude);
//     }
//   }
  
//   // 回溯最优路径
//   let w = capacity;
//   const selectedItems = [];
//   for (let i = items.length; i > 0; i--) {
//     if (dp[i][w] !== dp[i-1][w]) {
//       selectedItems.push(i-1);
//       w -= items[i-1].weight;
//     }
//     steps.push({
//       step: steps.length,
//       i: i,
//       w: w,
//       selected: false,
//       value: dp[i][w],
//       selectedItems: [...selectedItems],
//       remainingCapacity: capacity - w
//     });
//   }

//   this.dpSteps = steps;
// }
//   updateDPState = (step: DPState) => {
//   this.currentStep = step.step;
//   this.highlightedCell = {i: step.i, w: step.w};
//   this.selectedItems = step.selectedItems;
  
//   // 更新DP表格数据
//   if (step.step < this.dpSteps.length - this.items.length) {
//     this.dpTable[step.i + 1][step.w] = step.value;
//   }
// }
// 修改updateDPState方法
updateDPState = (step: DPState) => {
  this.previousCell = {...this.highlightedCell};
  this.currentStep = step.step;
  this.highlightedCell = {i: step.i, w: step.w};
  this.selectedItems = step.selectedItems;
   // 在最后一步启用最优路径显示
  this.showOptimalPath = this.isComplete;
  
  // 记录最终结果
  if (this.isComplete) {
    this.finalSelectedItems = [...step.selectedItems].reverse();
  }

  // 更新DP表数据
  if (step.step < this.dpSteps.length - this.items.length) {
    this.dpTable[step.i][step.w] = step.value;
  }
}

// 添加计算属性
get isComplete(): boolean {
  return this.currentStep === this.dpSteps.length - 1;
}

// 修改isCurrentCell方法
isCurrentCell(i: number, w: number): boolean {
  return this.highlightedCell.i === i && 
         this.highlightedCell.w === w;
}

// 添加前一个单元格判断
isPreviousCell(i: number, w: number): boolean {
  return this.previousCell.i === i && 
         this.previousCell.w === w;
}

// resetDPState = () => {
//   this.dpTable = Array(this.items.length+1)
//                 .fill(0)
//                 .map(() => Array(this.selectedCapacity+1).fill(0));
//   this.currentStep = -1;

// }
resetDPState = () => {
  this.dpTable = Array(this.items.length + 1)
    .fill(0)
    .map(() => Array(this.selectedCapacity + 1).fill(0));
  this.currentStep = -1;
  this.highlightedCell = { i: -1, w: -1 }; // 重置高亮单元格
  this.previousCell = { i: -1, w: -1 };    // 重置前一个单元格
  this.selectedItems = [];
  this.finalSelectedItems = [];
  this.optimalPathCells = []; // 重置最优路径单元格数组
  this.showOptimalPath = false; // 重置显示标志
};

  // openAddItemDialog(): void {
  //   const weightStr = prompt('请输入物品重量（正整数）');
  //   const valueStr = prompt('请输入物品价值（正整数）');

  //   const weight = Number(weightStr);
  //   const value = Number(valueStr);

  //   if (Number.isNaN(weight) || Number.isNaN(value) || weight <= 0 || value <= 0) {
  //     this.snackBar.open('输入无效，请输入正整数', '关闭', { duration: 3000 });
  //     return;
  //   }

  //   // 添加物品
  //   this.items.push({ weight, value });

  //   // 同步更新配置详情
  //   this.selectedJsonconfig = JSON.stringify(this.items, null, 2);
  //   this.onConfigChange();

  //   this.snackBar.open('新物品已添加', '关闭', { duration: 2000 });
  // }
  openAddItemDialog(): void {
    const dialogRef = this.dialog.open(AddItemDialogComponent, {
      width: '300px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.weight > 0 && result.value > 0) {
        this.items.push({ weight: result.weight, value: result.value });

        // 同步配置 JSON
        this.selectedJsonconfig = JSON.stringify(this.items, null, 2);
        this.onConfigChange();
        this.snackBar.open('新物品已添加', '关闭', { duration: 2000 });
        this.resetDPState();
      }
    });
    
  }

  // structure-component-dp-knapsack.component.ts
  deleteItem(index: number) {
    this.items.splice(index, 1);
    this.selectedJsonconfig = JSON.stringify(this.items, null, 2);
    this.onConfigChange();
    this.generateDPSteps(); // 重新生成DP步骤
    this.snackBar.open('物品已删除', '关闭', { duration: 2000 });
  }

  updateInstances(){
    const componentId = this.route.snapshot.paramMap.get("componentId");
    this.commonService.selectInstanceByComponentId(Number(componentId)).subscribe({
      next: (data: any) => {
        console.log(data);
        this.instances = data;
        this.instances.unshift({
              'name': 'default-instance', 
              'config': '[{"weight":2,"value":3},{"weight":3,"value":4}]'  // 修改默认配置格式
            });        
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

  // onConfigChange(){
  //   try {
  //     JSON.parse(this.selectedJsonconfig);
  //     this.selectedInstance!.config = this.selectedJsonconfig;
  //     this.items = JSON.parse(this.selectedJsonconfig);
  //   } catch (e) {
  //     console.error('无效的 JSON 格式:', e);
  //   }
  // }

   
  // 修改配置解析逻辑
  onConfigChange() {
    try {
      // 确保解析为Item数组
      const parsedItems = JSON.parse(this.selectedJsonconfig);
      if (!Array.isArray(parsedItems)) {
        throw new Error("配置必须是数组格式");
      }
      
      this.items = parsedItems.map(item => ({
        weight: Number(item.weight),
        value: Number(item.value)
      }));
      
      this.selectedInstance!.config = this.selectedJsonconfig;
    } catch (e) {
      console.error('配置解析错误:', e);
    }
  }

  onInstanceChange(event: any){
    this.items = JSON.parse(this.selectedInstance!['config']);
    this.selectedJsonconfig = this.selectedInstance!['config'];
    this.generateDPSteps();
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
