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
  selector: 'app-structure-component-binary-search',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSliderModule, MatExpansionModule, MatTabsModule, ...materialModules, InstanceManagerComponent, AnimationControllerComponent],
  templateUrl: './structure-component-binarySearch.component.html',
  styleUrls: ['./structure-component-binarySearch.component.css']
})
export class BinarySearchComponent {
  @ViewChild(InstanceManagerComponent) instanceManager!: InstanceManagerComponent;
  @ViewChild(AnimationControllerComponent) animationController!: AnimationControllerComponent;

  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;
  
  items: number[] = [];
  animationSteps: Array<{
    left: number;
    right: number;
    mid: number;
    comparing: number[]; // 当前正在比较的元素索引
    searchCount: number; // 比较次数
    found: boolean; // 是否找到目标值
    searchPath: number[];
  }> = [];
  searchValue: number = 0;
  
  left: number = -1;
  right: number = -1;
  mid: number = -1;
  comparing: number[] = []; 
  searchCount: number = 0;
  found = false;
  foundIndex: number = -1;
  searchPath: number[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private commonService: CommonService,
  ) {}

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
              this.instanceManager.updateInstances([1, 2, 3, 4, 5, 6, 7]);
            }
          },
          error: (err: any) => {
            console.log(err.error);
          }
        });
      }
    });

    // 绑定方法到当前组件实例
    this.generateBinarySearchSteps = this.generateBinarySearchSteps.bind(this);
    this.resetAnimationSteps = this.resetAnimationSteps.bind(this);
    this.updateAnimationSteps = this.updateAnimationSteps.bind(this);
  }

  // 二分查找
  generateBinarySearchSteps() {
    this.animationSteps = [];
    this.searchPath = [];
    let left = 0;
    let right = this.items.length - 1;
    let searchCount = 0;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      searchCount++;
      
      this.searchPath.push(mid);
      
      this.animationSteps.push({
        left: left,
        right: right,
        mid: mid,
        comparing: [mid],
        searchCount: searchCount,
        found: this.items[mid] === this.searchValue,
        searchPath: [...this.searchPath],
      });
      
      if (this.items[mid] === this.searchValue) {
        this.animationSteps.push({
          left: mid,
          right: mid,
          mid: mid,
          comparing: [],
          searchCount: searchCount,
          found: true,
          searchPath: [...this.searchPath],
        });
        break;
      } else if (this.items[mid] < this.searchValue) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    if (left > right) {
      this.animationSteps.push({
        left: -1,
        right: -1,
        mid: -1,
        comparing: [],
        searchCount: searchCount,
        found: false,
        searchPath: [...this.searchPath],
      });
    }
  }

  resetAnimationSteps() {
    this.left = -1;
    this.right = -1;
    this.mid = -1;
    this.comparing = [];
    this.searchCount = 0;
    this.foundIndex = -1;
    this.searchPath = [];
  }

  updateAnimationSteps(step: any) {
    this.left = step.left;
    this.right = step.right;
    this.mid = step.mid;
    this.comparing = step.comparing;
    this.searchCount = step.searchCount;
    this.found = step.found;
    this.foundIndex = step.found ? step.mid : -1;
    this.searchPath = step.searchPath;
  }

  onConfigUpdated(event: { instance: Instance | null, config: string }) {
    try {
      const newArray = JSON.parse(event.config);
      if (Array.isArray(newArray) && newArray.every(item => typeof item === 'number')) {
        this.items = newArray;
        this.generateBinarySearchSteps();
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
    const newArray = Array.from({ length }, () => Math.floor(Math.random() * 100));
    newArray.sort((a, b) => a - b); // 确保数组有序
    
    // 更新实例管理器的配置
    if (this.instanceManager) {
      this.instanceManager.selectedJsonconfig = JSON.stringify(newArray);
    }
    
    this.items = newArray;
    this.resetAnimationSteps();
  }

  getBinarySearchDescription(): { algorithm: string, visualization: string } {
    return {
      algorithm: `二分查找的平均时间复杂度为 O(logn)
具体步骤：
1. 选择数组的中间元素
2. 如果中间元素等于目标值，查找结束
3. 如果中间元素小于目标值，查找右半部分
4. 如果中间元素大于目标值，查找左半部分
5. 重复步骤1-4，直到找到目标值或数组为空`,
      visualization: `
可视化元素说明：
- 黄色方块：当前正在比较的元素
- 绿色方块：找到的目标元素
- 紫色边框：查找路径
- 数字标记：访问顺序
- L标记：左指针位置
- R标记：右指针位置
- M标记：中间指针位置`
    }
  }
}
