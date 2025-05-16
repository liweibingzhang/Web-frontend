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
import { Instance } from '../../../../models/instance.model';
import { User } from '../../../../models/user.model';
import { Group } from '../../../../models/group.model';
import { MyComponent } from '../../../../models/component.model';
import { InstanceManagerComponent } from '../instance-manager/instance-manager.component';
import { AnimationControllerComponent } from '../animation-controller/animation-controller.component';

@Component({
  selector: 'app-structure-component-quicksort',
  imports: [CommonModule, FormsModule, MatSliderModule, MatExpansionModule, MatTabsModule, ...materialModules, InstanceManagerComponent, AnimationControllerComponent],
  templateUrl: './structure-component-quickSort.component.html',
  styleUrls: ['./structure-component-quickSort.component.css'],
  standalone: true
})
export class QuickSortComponent {
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
    swapped: boolean,
    pivot: number,      // 基准值位置
    partitionRange: number[], // 当前分区范围
    compareCount: number,
    swapCount: number,
    leftIndex: number,  // 当前 left 位置
    rightIndex: number  // 当前 right 位置
  }> = [];
  compareCount: number = 0; // 比较次数
  swapCount: number = 0; // 交换次数

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private commonService: CommonService,
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
    this.generateQuickSortSteps = this.generateQuickSortSteps.bind(this);
    this.resetAnimationSteps = this.resetAnimationSteps.bind(this);
    this.updateAnimationSteps = this.updateAnimationSteps.bind(this);
  }
  
  // 快速排序
  generateQuickSortSteps() {
    this.animationSteps = [];
    const arr = [...this.items];
    this.compareCount = 0;
    this.swapCount = 0;
    
    const quickSort = (arr: number[], left: number, right: number) => {
      if (left < right) {
        this.animationSteps.push({
          array: [...arr],
          comparing: [],
          swapped: false,
          pivot: right,
          partitionRange: [left, right],
          compareCount: this.compareCount,
          swapCount: this.swapCount,
          leftIndex: left,
          rightIndex: right
        });
        const pivotIndex = this.partition(arr, left, right);
        quickSort(arr, left, pivotIndex - 1); // 递归排序左半部分
        quickSort(arr, pivotIndex + 1, right); // 递归排序右半部分
      }
    };
    
    quickSort(arr, 0, arr.length - 1); // 初始调用，对整个数组排序
  }

  private partition(arr: number[], begin: number, end: number): number {
    // 选择最右边的元素作为基准值
    const pivot = arr[end];
    let left = begin;
    let right = end - 1;
    
    while (true) {
      // 右指针先行，找第一个小于等于基准的元素
      while (right >= left) {
        this.compareCount++;
        this.animationSteps.push({
          array: [...arr],
          comparing: [right, end],
          swapped: false,
          pivot: end,
          partitionRange: [begin, end],
          compareCount: this.compareCount,
          swapCount: this.swapCount,
          leftIndex: left,
          rightIndex: right
        });
        
        if (arr[right] <= pivot) break;
        right--;
      }
      
      // 左指针找第一个大于等于基准的元素
      while (left <= right) {
        this.compareCount++;
        this.animationSteps.push({
          array: [...arr],
          comparing: [left, end],
          swapped: false,
          pivot: end,
          partitionRange: [begin, end],
          compareCount: this.compareCount,
          swapCount: this.swapCount,
          leftIndex: left,
          rightIndex: right
        });
        
        if (arr[left] >= pivot) break;
        left++;
      }
      
      // 如果left和right还没有相遇，交换元素
      if (left < right) {
        [arr[left], arr[right]] = [arr[right], arr[left]];
        this.swapCount++;
        
        this.animationSteps.push({
          array: [...arr],
          comparing: [left, right],
          swapped: true,
          pivot: end,
          partitionRange: [begin, end],
          compareCount: this.compareCount,
          swapCount: this.swapCount,
          leftIndex: left,
          rightIndex: right
        });
        
        left++;
        right--;
      } else {
        break;
      }
    }
    
    // 将基准值放到正确的位置
    [arr[left], arr[end]] = [arr[end], arr[left]];
    this.swapCount++;
    
    this.animationSteps.push({
      array: [...arr],
      comparing: [left, end],
      swapped: true,
      pivot: left,
      partitionRange: [begin, end],
      compareCount: this.compareCount,
      swapCount: this.swapCount,
      leftIndex: left,
      rightIndex: right
    });
    
    return left;
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
        this.generateQuickSortSteps();
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
    this.generateQuickSortSteps();
    this.resetAnimationSteps();
  }

  getQuickSortDescription(): { algorithm: string, visualization: string } {
    return {
      algorithm: `快速排序的平均时间复杂度为 O(nlogn)
基本思想：
1. 选择一个基准值（pivot）
2. 将数组分为两部分：小于基准值的元素和大于基准值的元素
3. 递归地对这两部分进行排序
具体步骤：
- 选择最右边的元素作为基准值
- 使用左右指针，右指针找第一个小于等于基准的元素
- 左指针找第一个大于等于基准的元素
- 交换这两个元素
- 重复上述过程直到指针相遇
- 将基准值放到最终位置`,
      visualization: `
黄色方块：当前正在比较的元素
绿色方块：已完成交换的元素
pivot：当前基准值的位置
left：左指针位置
right：右指针位置`
    };
  }
}

