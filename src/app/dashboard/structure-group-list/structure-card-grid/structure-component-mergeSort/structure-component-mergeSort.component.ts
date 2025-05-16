import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { materialModules } from '../../../../shared/material';
import { MatSliderModule } from '@angular/material/slider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { CommonService } from '../../../../services/common.service';
import { MatDialog } from '@angular/material/dialog';
import { Instance } from '../../../../models/instance.model';
import { User } from '../../../../models/user.model';
import { Group } from '../../../../models/group.model';
import { MyComponent } from '../../../../models/component.model';
import { InstanceManagerComponent } from '../instance-manager/instance-manager.component';
import { AnimationControllerComponent } from '../animation-controller/animation-controller.component';

@Component({
  selector: 'app-structure-component-mergesort',
  imports: [CommonModule, FormsModule, MatSliderModule, MatExpansionModule, MatTabsModule, ...materialModules, InstanceManagerComponent, AnimationControllerComponent],
  templateUrl: './structure-component-mergeSort.component.html',
  styleUrls: ['./structure-component-mergeSort.component.css'],
  standalone: true
})
export class MergeSortComponent {
  @ViewChild(InstanceManagerComponent) instanceManager!: InstanceManagerComponent;
  @ViewChild(AnimationControllerComponent) animationController!: AnimationControllerComponent;

  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;

  items: number[] = [];
  animationSteps: Array<{
    array: number[],
    comparing: number[],
    merged: number[];        // 已合并的元素
    mergeRange: number[],  // 正在合并的区域
    leftArray: number[],   // 左子数组
    rightArray: number[],  // 右子数组
    currentPosition: number; // 当前处理位置
    compareCount: number,
    swapCount: number
  }> = [];
  compareCount: number = 0;
  swapCount: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private commonService: CommonService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.authService.checkLoginStatus();
    this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (this.user == null) {
        this.router.navigate(['/login']);
      } else {
        const groupId = this.route.snapshot.paramMap.get("groupId");
        this.commonService.selectGroupById(Number(groupId)).subscribe({
          next: (data: any) => {
            this.group = data;
          },
          error: (err: any) => {
            console.log(err.error);
          }
        });
        const componentId = this.route.snapshot.paramMap.get("componentId");
        this.commonService.selectComponentById(Number(componentId)).subscribe({
          next: (data: any) => {
            this.component = data;
            // 初始化实例管理器
            if (this.instanceManager) {
              this.instanceManager.updateInstances([64, 34, 25, 12, 22, 11, 90]);
            }
          },
          error: (err: any) => {
            console.log(err.error);
          }
        });
      }
    });

    // 绑定方法到当前组件实例
    this.generateMergeSortSteps = this.generateMergeSortSteps.bind(this);
    this.resetAnimationSteps = this.resetAnimationSteps.bind(this);
    this.updateAnimationSteps = this.updateAnimationSteps.bind(this);
  }

  // 归并排序
  generateMergeSortSteps() {
    this.animationSteps = [];
    const arr = [...this.items]; // 复制原数组，避免直接修改
    this.compareCount = 0;
    this.swapCount = 0;
    
    const mergeSort = (arr: number[], start: number, end: number) => {
      if (start < end) {
        const mid = Math.floor((start + end) / 2);
        
        // 递归排序左右两半
        mergeSort(arr, start, mid);
        mergeSort(arr, mid + 1, end);
        
        // 合并两个已排序的部分
        merge(arr, start, mid, end);
      }
    };
    
    const merge = (arr: number[], start: number, mid: number, end: number) => {
      const leftArray = arr.slice(start, mid + 1); // 左子数组
      const rightArray = arr.slice(mid + 1, end + 1);   // 右子数组
      const merged: number[] = [];
      
      let i = 0, j = 0, k = start;
      
      while (i < leftArray.length && j < rightArray.length) {
        this.compareCount++;
        
        this.animationSteps.push({
          array: [...arr],
          comparing: [start + i, mid + 1 + j],
          merged: [...merged],
          mergeRange: [start, end],
          leftArray: [...leftArray],
          rightArray: [...rightArray],
          currentPosition: k,
          compareCount: this.compareCount,
          swapCount: this.swapCount,
        });
        
        // 比较并放入原数组
        if (leftArray[i] <= rightArray[j]) {
          arr[k] = leftArray[i];
          merged.push(k);
          i++;
        } else {
          arr[k] = rightArray[j];
          merged.push(k);
          j++;
          this.swapCount++;
        }
        
        this.animationSteps.push({
          array: [...arr],
          comparing: [],
          merged: [...merged],
          mergeRange: [start, end],
          leftArray: [...leftArray],
          rightArray: [...rightArray],
          currentPosition: k,
          compareCount: this.compareCount,
          swapCount: this.swapCount
        });
        
        k++;
      }
      
      // 处理剩余元素
      while (i < leftArray.length) {
        arr[k] = leftArray[i];
        merged.push(k);
        
        this.animationSteps.push({
          array: [...arr],
          comparing: [k],
          merged: [...merged],
          mergeRange: [start, end],
          leftArray: [...leftArray],
          rightArray: [...rightArray],
          currentPosition: k,
          compareCount: this.compareCount,
          swapCount: this.swapCount
        });
        
        i++;
        k++;
      }
      
      while (j < rightArray.length) {
        arr[k] = rightArray[j];
        merged.push(k);
        
        this.animationSteps.push({
          array: [...arr],
          comparing: [k],
          merged: [...merged],
          mergeRange: [start, end],
          leftArray: [...leftArray],
          rightArray: [...rightArray],
          currentPosition: k,
          compareCount: this.compareCount,
          swapCount: this.swapCount
        });
        
        j++;
        k++;
      }
    };
    
    mergeSort(arr, 0, arr.length - 1);
  }

  resetAnimationSteps() {
    if (this.instanceManager && this.instanceManager.selectedJsonconfig) {
      this.items = JSON.parse(this.instanceManager.selectedJsonconfig);
    }
    this.compareCount = 0;
    this.swapCount = 0;
  }

  updateAnimationSteps(step: any) {
    this.items = step.array;
    this.compareCount = step.compareCount;
    this.swapCount = step.swapCount;
  }

  onConfigUpdated(event: { instance: Instance | null, config: string }) {
    try {
      const newArray = JSON.parse(event.config);
      if (Array.isArray(newArray) && newArray.every(item => typeof item === 'number')) {
        this.items = newArray;
        this.generateMergeSortSteps();
        this.resetAnimationSteps();
      } else {
        throw new Error('Invalid array format');
      }
    } catch (e) {
      console.error('无效的数组格式:', e);
    }
  }

  onGenerateRandom() {
    const length = Math.floor(Math.random() * 4) + 4; // 4-7个随机数
    const newArray = Array.from({length}, () => Math.floor(Math.random() * 100) + 1);
    
    // 更新实例管理器的配置
    if (this.instanceManager) {
      this.instanceManager.selectedJsonconfig = JSON.stringify(newArray);
    }
    
    // 更新当前数组并生成排序步骤
    this.items = newArray;
    this.generateMergeSortSteps();
    this.resetAnimationSteps();
  }

  getMergeSortDescription(): { algorithm: string, visualization: string } {
    return {
      algorithm: `归并排序的平均时间复杂度为 O(nlogn)
基本思想：
1. 将数组分成两个子数组
2. 递归地对子数组进行排序
3. 合并两个已排序的子数组
具体步骤：
- 递归分割数组，直到子数组长度为1
- 比较左右子数组的元素
- 按顺序合并到临时数组中
- 将临时数组复制回原数组`,
      visualization: `
可视化元素说明：
- 黄色方块：当前正在比较的元素
- 绿色方块：已完成合并的元素
- 虚线框：当前正在合并的区间范围
- L标记：左子数组元素
- R标记：右子数组元素
- ▲标记：当前处理位置`
    };
  }
}


