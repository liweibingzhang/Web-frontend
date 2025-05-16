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
import { InstanceManagerComponent } from '../instance-manager/instance-manager.component';
import { AnimationControllerComponent } from '../animation-controller/animation-controller.component';
import { MyComponent } from '../../../../models/component.model';

@Component({
  selector: 'app-structure-component-bubblesort',
  imports: [CommonModule, FormsModule, MatSliderModule, MatExpansionModule, MatTabsModule, ...materialModules,InstanceManagerComponent, AnimationControllerComponent],
  templateUrl: './structure-component-bubbleSort.component.html',
  styleUrls: ['./structure-component-bubbleSort.component.css'],
  standalone: true
})
export class BubbleSortComponent {
  @ViewChild(InstanceManagerComponent) instanceManager!: InstanceManagerComponent;
  @ViewChild(AnimationControllerComponent) animationController!: AnimationControllerComponent;

  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;
  
  items: number[] = []; // 要排序的数组
  animationSteps: Array<{
    array: number[], 
    comparing: number[], 
    swapped: boolean,
    compareCount: number,
    swapCount: number
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
    this.generateBubbleSortSteps = this.generateBubbleSortSteps.bind(this);
    this.resetAnimationSteps = this.resetAnimationSteps.bind(this);
    this.updateAnimationSteps = this.updateAnimationSteps.bind(this);
  }

  // 冒泡排序
  generateBubbleSortSteps() {
    this.animationSteps = [];
    const arr = [...this.items];
    const n = arr.length;
    
    // 重置计数器
    this.compareCount = 0;
    this.swapCount = 0;

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        this.compareCount++; // 增加比较次数
        
        this.animationSteps.push({
          array: [...arr],
          comparing: [j, j + 1],
          swapped: false,
          compareCount: this.compareCount,
          swapCount: this.swapCount
        });

        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          this.swapCount++; // 增加交换次数
          
          this.animationSteps.push({
            array: [...arr],
            comparing: [j, j + 1],
            swapped: true,
            compareCount: this.compareCount,
            swapCount: this.swapCount
          });
        }
      }
    }
    
    this.animationSteps.push({
      array: [...arr],
      comparing: [],
      swapped: false,
      compareCount: this.compareCount,
      swapCount: this.swapCount
    });
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
        this.generateBubbleSortSteps();
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
    
    if (this.instanceManager) {
      this.instanceManager.selectedJsonconfig = JSON.stringify(newArray);
    }
    
    this.items = newArray;
    this.generateBubbleSortSteps();
    this.resetAnimationSteps();
  }

  getBubbleSortDescription(): { algorithm: string, visualization: string } {
    return {
      algorithm: `冒泡排序的平均时间复杂度为 O(n^2)
基本思想：
1. 重复地走访要排序的数列
2. 一次比较两个元素，如果它们的顺序错误就交换
3. 重复步骤1和2，直到没有需要交换的元素
具体步骤：
- 从头到尾比较相邻的元素，如果顺序错误就交换
- 重复上述过程直到没有需要交换的元素`,
      visualization: `
黄色方块：当前正在比较的元素
绿色方块：已完成交换的元素`
      };
  }
}
