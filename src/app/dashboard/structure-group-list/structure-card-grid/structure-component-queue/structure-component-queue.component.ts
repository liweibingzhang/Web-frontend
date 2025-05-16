import { Component } from '@angular/core';
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
import { SaveInstanceDialogComponent } from '../save-instances-dialog/save-instances-dialog.component';
import { AiDialogComponent } from '../../../ai-dialog/ai-dialog.components';
import { User } from '../../../../models/user.model';
import { Group } from '../../../../models/group.model';
import { MyComponent } from '../../../../models/component.model';

@Component({
  selector: 'app-structure-component-queue',
  imports: [CommonModule, FormsModule, MatSliderModule, MatExpansionModule, MatTabsModule, ...materialModules],
  templateUrl: './structure-component-queue.component.html',
  styleUrls: ['./structure-component-queue.component.css'],
  standalone: true
})
export class QueueComponent {
  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;
  instances: Instance[] = [];
  selectedInstance: Instance | null = null;
  selectedJsonconfig: string = '';

  items: number[] = []; // Queue data (using array for visualization)
  inputValue: number | null = null; // Input value for enqueue operation
  isAnimating: boolean = false;
  isPaused: boolean = false;
  currentStep: number = -1;
  animationSpeed: number = 500;
  animationSteps: Array<{
    array: number[],
    operation: string, // "enqueued", "dequeuing", "state", "initial"
    value?: number,
    index?: number // Index might be useful for highlighting dequeued item
  }> = [];
  canStepBackward: boolean = false;
  canStepForward: boolean = false;

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
        // Default queue instance (example)
        const defaultQueue = [10, 20, 30, 40];
        this.instances.unshift({
          'name': 'default-instance',
          'config': JSON.stringify(defaultQueue)
        });
        this.selectedInstance = this.instances[0];
        this.items = JSON.parse(this.selectedInstance['config']);
        this.selectedJsonconfig = this.selectedInstance['config'];
        this.generateQueueSteps(); // Changed method name
      },
      error: (err: any) => {
        console.log(err.error);
      }
    });
  }

  generateQueueSteps() { // Changed method name
    this.animationSteps = [];
    this.animationSteps.push({
      array: [...this.items],
      operation: "initial",
    });
    this.updateStepControls(); // Update controls after generating steps
  }

  enqueue() { // Changed method name
    if (this.inputValue !== null) {
      this.isAnimating = true;
      this.isPaused = false;

      // If current animationSteps only contains an "initial" state, replace it.
      if (this.animationSteps.length === 1 && this.animationSteps[0].operation === 'initial') {
        this.animationSteps = [];
        this.currentStep = 0;
      } else {
        // Otherwise, append new steps and set currentStep to the start of these new steps.
        this.currentStep = this.animationSteps.length;
      }

      const valueToEnqueue = this.inputValue;
      this.items.push(valueToEnqueue); // Actual data modification (add to the end)

      // Add the animation step for the "enqueued" state
      this.animationSteps.push({
        array: [...this.items], // State of the queue AFTER enqueue
        operation: "enqueued",
        value: valueToEnqueue,
        index: this.items.length - 1 // Index where the new item was added
      });

      this.inputValue = null;
      this.animate();
    }
  }

  dequeue() { // Changed method name
    if (this.items.length > 0) {
      this.isAnimating = true;
      this.isPaused = false;

      // If current animationSteps only contains an "initial" state, replace it.
      if (this.animationSteps.length === 1 && this.animationSteps[0].operation === 'initial') {
        this.animationSteps = [];
        this.currentStep = 0;
      } else {
        // Otherwise, append new steps and set currentStep to the start of these new steps.
        this.currentStep = this.animationSteps.length;
      }

      const valueToDequeue = this.items[0]; // Element to remove is at the beginning
      const indexToDequeue = 0; // Index of the element to remove

      // Step 1: Highlight the item to be dequeued
      this.animationSteps.push({
        array: [...this.items], // Current state of the queue (before actual dequeue)
        operation: "dequeuing",
        value: valueToDequeue,
        index: indexToDequeue
      });

      this.items.shift(); // Actual data modification (remove from the beginning)

      // Step 2: Show the queue after the item is dequeued
      this.animationSteps.push({
        array: [...this.items], // State of the queue AFTER dequeue
        operation: "state",     // Generic state, item is visually gone
      });

      this.animate();
    }
  }

  startAnimation() {
    if (this.isAnimating || this.isPaused) return;
    // Ensure animationSteps is fresh if starting from scratch
    if (this.currentStep === -1 || this.currentStep >= this.animationSteps.length -1) {
      this.generateQueueSteps(); // Re-generate based on current items if at end or reset
      this.items = [...this.animationSteps[0].array]; // Reflect initial state
    }
    this.isAnimating = true;
    this.isPaused = false;
    this.currentStep = 0; // Start from the beginning of animationSteps
    this.animate();
  }

  pauseAnimation() {
    if (!this.isAnimating || this.isPaused) return;
    this.isPaused = true;
    this.isAnimating = false;
    this.updateStepControls();
  }

  resumeAnimation() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.isAnimating = true;
    if (this.currentStep < 0 || this.currentStep >= this.animationSteps.length) {
      this.currentStep = 0;
    }
    this.animate();
  }

  resetAnimation() {
    this.isAnimating = false;
    this.isPaused = false;
    this.currentStep = -1;
    if (this.selectedInstance && this.selectedInstance.config) {
      this.selectedJsonconfig = this.selectedInstance.config;
      this.items = JSON.parse(this.selectedJsonconfig);
    } else {
      // Fallback if selectedInstance or its config isn't available
      this.items = []; // Or a predefined default initial queue
    }
    this.generateQueueSteps(); // This will create an 'initial' step
    if (this.animationSteps.length > 0) {
      this.items = [...this.animationSteps[0].array];
    }
    this.updateStepControls();
  }

  animate() {
    if (this.isPaused) {
      this.updateStepControls();
      return;
    }

    if (!this.isAnimating || this.currentStep < 0 || this.currentStep >= this.animationSteps.length) {
      this.isAnimating = false;
      if (this.animationSteps.length > 0) {
        if (this.currentStep >= this.animationSteps.length) {
          this.items = [...this.animationSteps[this.animationSteps.length - 1].array];
        } else if (this.currentStep < 0) {
          if (this.animationSteps[0]) this.items = [...this.animationSteps[0].array];
        } else {
          this.items = [...this.animationSteps[this.currentStep].array];
        }
      }
      this.updateStepControls();
      return;
    }

    const step = this.animationSteps[this.currentStep];
    this.items = [...step.array];
    this.updateStepControls();

    setTimeout(() => {
      if (this.isAnimating && !this.isPaused) {
        this.currentStep++;
        this.animate();
      } else if (this.isPaused) {
        this.updateStepControls();
      } else if (!this.isAnimating) {
        this.updateStepControls();
      }
    }, this.actualDelay);
  }


  private get actualDelay(): number {
    return 1100 - this.animationSpeed;
  }

  onSpeedChange(event: any) {
    // If using ngModel, animationSpeed is already updated.
  }

  saveInstance() {
    const dialogRef = this.dialog.open(SaveInstanceDialogComponent, {
      width: '300px',
      data: { name: '' }
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      if (result) {
        this.selectedJsonconfig = JSON.stringify(this.items);
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
    this.selectedJsonconfig = JSON.stringify(this.items);
    const dataToExport = JSON.parse(this.selectedJsonconfig);
    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedInstance ? this.selectedInstance['name'] : 'queue-instance'}.json`; // Changed filename
    a.click();

    URL.revokeObjectURL(url);
  }

  onConfigChange() {
    try {
      const newArray = JSON.parse(this.selectedJsonconfig);
      if (Array.isArray(newArray) && newArray.every(item => typeof item === 'number')) {
        if (this.selectedInstance) {
          this.selectedInstance.config = this.selectedJsonconfig;
        }
        this.items = newArray;
        this.resetAnimation();
      } else {
        console.error('Invalid array format in config');
      }
    } catch (e) {
      console.error('无效的 JSON 格式:', e);
    }
  }


  onInstanceChange(event: any) {
    if (this.selectedInstance && this.selectedInstance.config) {
      this.selectedJsonconfig = this.selectedInstance.config;
      this.items = JSON.parse(this.selectedJsonconfig);
      this.resetAnimation();
    }
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
      data: {}
    });
  }

  generateRandomArray() {
    const length = Math.floor(Math.random() * 4) + 2; // Random length between 2 and 5
    const newArray = Array.from({ length }, () => Math.floor(Math.random() * 100) + 1);

    this.selectedJsonconfig = JSON.stringify(newArray);
    this.items = newArray;
    if (this.selectedInstance) {
      this.selectedInstance.config = this.selectedJsonconfig;
    }
    this.resetAnimation(); // This will call generateQueueSteps with the new items
  }

  stepBackward() {
    if (this.canStepBackward && this.currentStep > 0) {
      this.isAnimating = false;
      this.isPaused = true;
      this.currentStep--;
      if (this.animationSteps[this.currentStep]) {
        this.items = [...this.animationSteps[this.currentStep].array];
      }
      this.updateStepControls();
    }
  }

  stepForward() {
    if (this.canStepForward && this.currentStep < this.animationSteps.length - 1) {
      this.isAnimating = false;
      this.isPaused = true;
      this.currentStep++;
      if (this.animationSteps[this.currentStep]) {
        this.items = [...this.animationSteps[this.currentStep].array];
      }
      this.updateStepControls();
    }
  }

  private updateStepControls() {
    this.canStepBackward = this.currentStep > 0 && this.animationSteps.length > 0;
    this.canStepForward = this.currentStep < this.animationSteps.length - 1;
  }
}
