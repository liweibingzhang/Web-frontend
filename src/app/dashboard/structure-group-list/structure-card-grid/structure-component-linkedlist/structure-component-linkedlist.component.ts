import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { materialModules } from '../../../../shared/material';
import { MatSliderModule } from '@angular/material/slider';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { CommonService } from '../../../../services/common.service';
import { MatDialog } from '@angular/material/dialog';
import { Instance } from '../../../../models/instance.model';
import { SaveInstanceDialogComponent } from '../save-instances-dialog/save-instances-dialog.component';
import { AiDialogComponent } from '../../../ai-dialog/ai-dialog.components';
import { User } from '../../../../models/user.model';
import { Group } from '../../../../models/group.model';
import { MyComponent } from '../../../../models/component.model';

class Node {
  constructor(public value: number, public next: Node | null = null) {}
}

@Component({
  selector: 'app-structure-component-linkedlist',
  imports: [CommonModule, FormsModule, MatSliderModule, ...materialModules],
  templateUrl: './structure-component-linkedList.component.html',
  styleUrls: ['./structure-component-linkedList.component.css'],
  standalone: true
})
export class LinkedListComponent {
  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;
  instances: Instance[] = [];
  selectedInstance: Instance | null = null;
  selectedJsonconfig: string = '';
  searchResultMessage: string = '';

  head: Node | null = null;
  linkedListNodes: { value: number }[] = [];
  isAnimating: boolean = false;
  isPaused: boolean = false;
  currentStep: number = -1;
  animationSpeed: number = 500; // 动画速度（毫秒）
  animationSteps: Array<{
    nodes: { value: number }[];
    comparing: number[];
    modified: number[];
  }> = [];
  canStepBackward: boolean = false;
  canStepForward: boolean = false;
  inputValue: number = 0;

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
          },
          error: (err: any) => {
            console.log(err.error);
          }
        });

        this.updateInstances();
      }
    });
  }

  updateInstances() {
    const componentId = this.route.snapshot.paramMap.get("componentId");
    this.commonService.selectInstanceByComponentId(Number(componentId)).subscribe({
      next: (data: any) => {
        this.instances = data;
        const defaultArray = [1, 2, 3];
        this.instances.unshift({
          'name': 'default-instance',
          'config': JSON.stringify(defaultArray)
        });
        this.selectedInstance = this.instances[0];
        this.selectedJsonconfig = this.selectedInstance['config'];
        this.buildLinkedList(JSON.parse(this.selectedJsonconfig));
        this.generateSteps([]);
      },
      error: (err: any) => {
        console.log(err.error);
      }
    });
  }

  buildLinkedList(arr: number[]) {
    this.head = null;
    for (let i = arr.length - 1; i >= 0; i--) {
      this.head = new Node(arr[i], this.head);
    }
    this.updateLinkedListNodes();
  }

  updateLinkedListNodes() {
    this.linkedListNodes = [];
    let current = this.head;
    while (current) {
      this.linkedListNodes.push({ value: current.value });
      current = current.next;
    }
  }

  generateSteps(operationSteps: { nodes: { value: number }[]; comparing: number[]; modified: number[] }[]) {
    this.animationSteps = operationSteps;
    this.currentStep = -1;
    this.updateStepControls();
  }

  // 头插法插入值
  insertValue() {
    const steps: { nodes: { value: number }[]; comparing: number[]; modified: number[] }[] = [];
    const newNode = new Node(this.inputValue);
    let current = this.head;
    let index = 0;
    steps.push({
      nodes: this.linkedListNodes,
      comparing: [],
      modified: []
    });
    newNode.next = this.head;
    this.head = newNode;
    this.updateLinkedListNodes();
    steps.push({
      nodes: this.linkedListNodes,
      comparing: [],
      modified: [0]
    });
    this.generateSteps(steps);
    this.startAnimation();
  }

  // 删除值
  deleteValue() {
    const steps: { nodes: { value: number }[]; comparing: number[]; modified: number[] }[] = [];
    let current = this.head;
    let prev: Node | null = null;
    let index = 0;
    let found = false;
    steps.push({
      nodes: this.linkedListNodes,
      comparing: [],
      modified: []
    });
    while (current) {
      steps.push({
        nodes: this.linkedListNodes,
        comparing: [index],
        modified: []
      });
      if (current.value === this.inputValue) {
        found = true;
        if (prev) {
          prev.next = current.next;
        } else {
          this.head = current.next;
        }
        this.updateLinkedListNodes();
        steps.push({
          nodes: this.linkedListNodes,
          comparing: [],
          modified: [index]
        });
        break;
      }
      prev = current;
      current = current.next;
      index++;
    }
    if (!found) {
      console.log('值不存在');
    }
    this.generateSteps(steps);
    this.startAnimation();
  }

  // 查找值
  searchValue() {
    const steps: { nodes: { value: number }[]; comparing: number[]; modified: number[] }[] = [];
    let current = this.head;
    let index = 0;
    let found = false;
    this.searchResultMessage = ''; // ✅ 每次查找前清空消息

    steps.push({
      nodes: this.linkedListNodes,
      comparing: [],
      modified: []
    });

    while (current) {
      steps.push({
        nodes: this.linkedListNodes,
        comparing: [index],
        modified: []
      });

      if (current.value === this.inputValue) {
        found = true;
        steps.push({
          nodes: this.linkedListNodes,
          comparing: [index],
          modified: [index]
        });
        this.searchResultMessage = `找到值，位序为 ${index + 1}`; // ✅ 记录查找结果
        break;
      }
      current = current.next;
      index++;
    }

    if (!found) {
      this.searchResultMessage = '值不存在'; // ✅ 未找到提示
    }

    this.generateSteps(steps);
    this.startAnimation();
  }

  // 开始
  startAnimation() {
    if (this.isAnimating || this.isPaused) return;
    this.isAnimating = true;
    this.isPaused = false;
    this.currentStep = 0;
    this.animate();
  }

  // 暂停
  pauseAnimation() {
    if (!this.isAnimating || this.isPaused) return;
    this.isPaused = true;
    this.isAnimating = false;
  }

  // 继续
  resumeAnimation() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.isAnimating = true;
    this.animate();
  }

  // 重置
  resetAnimation() {
    this.isAnimating = false;
    this.isPaused = false;
    this.currentStep = -1;
    this.buildLinkedList(JSON.parse(this.selectedJsonconfig));
    this.updateStepControls();
  }

  animate() {
    if (this.isPaused || !this.isAnimating || this.currentStep >= this.animationSteps.length) {
      if (this.currentStep >= this.animationSteps.length) {
        this.isAnimating = false;
        this.isPaused = false;

        // ✅ 动画结束后显示查找信息（仅对 search 有意义）
        if (this.searchResultMessage) {
          alert(this.searchResultMessage); // 可改为更美观的组件弹窗或 toast
        }
      }
      return;
    }

    const step = this.animationSteps[this.currentStep];
    this.linkedListNodes = step.nodes;
    this.updateStepControls();

    setTimeout(() => {
      this.currentStep++;
      this.animate();
    }, this.animationSpeed);
  }

  private get actualDelay(): number {
    return 1100 - this.animationSpeed;
  }

  onSpeedChange(event: any) {
    this.animationSpeed = event.value;
  }

  saveInstance() {
    const dialogRef = this.dialog.open(SaveInstanceDialogComponent, {
      width: '300px',
      data: { name: '' }
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      if (result) {
        const insertedInstance = {
          "component_id": this.component!['id'],
          "name": result,
          "config": this.selectedJsonconfig
        };
        this.commonService.insertInstance(insertedInstance).subscribe({
          next: (data: any) => {
            alert('保存成功');
            this.updateInstances();
          },
          error: (err: any) => {
            alert('保存失败');
          }
        });
      }
    });
  }

  exportInstance() {
    const dataToExport = JSON.parse(this.selectedJsonconfig);
    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedInstance!['name']}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  onConfigChange() {
    try {
      const newArray = JSON.parse(this.selectedJsonconfig);
      if (Array.isArray(newArray) && newArray.every(item => typeof item === 'number')) {
        this.selectedInstance!.config = this.selectedJsonconfig;
        this.buildLinkedList(newArray);
        this.generateSteps([]);
      } else {
        throw new Error('Invalid array format');
      }
    } catch (e) {
      console.error('无效的 JSON 格式:', e);
    }
  }

  onInstanceChange(event: any) {
    this.selectedJsonconfig = this.selectedInstance!['config'];
    this.buildLinkedList(JSON.parse(this.selectedJsonconfig));
    this.generateSteps([]);
    this.resetAnimation();
  }

  deleteInstance(instance: any) {
    if ('id' in instance) {
      this.commonService.deleteInstanceById(instance['id']).subscribe({
        next: (data: any) => {
          alert('删除成功');
          this.updateInstances();
        },
        error: (err: any) => {
          alert('删除失败');
        }
      });
    } else {
      alert('不能删除默认实例');
    }
  }

  aiHelper() {
    const dialogRef = this.dialog.open(AiDialogComponent, {
      width: '300px',
      data: { }
    });
  }

  stepBackward() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.linkedListNodes = this.animationSteps[this.currentStep].nodes;
      this.updateStepControls();
    }
  }

  stepForward() {
    if (this.currentStep < this.animationSteps.length - 1) {
      this.currentStep++;
      this.linkedListNodes = this.animationSteps[this.currentStep].nodes;
      this.updateStepControls();
    }
  }

  private updateStepControls() {
    this.canStepBackward = this.currentStep > 0;
    this.canStepForward = this.currentStep < this.animationSteps.length - 1;
  }
}
