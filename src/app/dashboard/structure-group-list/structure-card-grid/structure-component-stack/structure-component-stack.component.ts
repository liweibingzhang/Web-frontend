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
  selector: 'app-structure-component-stack',
  imports: [CommonModule, FormsModule, MatSliderModule, MatExpansionModule, MatTabsModule, ...materialModules],
  templateUrl: './structure-component-stack.component.html',
  styleUrls: ['./structure-component-stack.component.css'],
  standalone: true
})
export class StackComponent {
  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;
  instances: Instance[] = [];
  selectedInstance: Instance | null = null;
  selectedJsonconfig: string = '';

  items: number[] = []; // Stack data
  inputValue: number | null = null; // Input value for push operation
  isAnimating: boolean = false;
  isPaused: boolean = false;
  currentStep: number = -1;
  animationSpeed: number = 500;
  animationSteps: Array<{
    array: number[],
    operation: string, // "pushed", "popping", "state", "initial"
    value?: number,
    index?: number
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
        const defaultStack = [3, 1, 4, 1, 5];
        this.instances.unshift({
          'name': 'default-instance',
          'config': JSON.stringify(defaultStack)
        });
        this.selectedInstance = this.instances[0];
        this.items = JSON.parse(this.selectedInstance['config']);
        this.selectedJsonconfig = this.selectedInstance['config'];
        this.generateStackSteps();
      },
      error: (err: any) => {
        console.log(err.error);
      }
    });
  }

  generateStackSteps() {
    this.animationSteps = [];
    this.animationSteps.push({
      array: [...this.items],
      operation: "initial",
    });
    this.updateStepControls(); // Update controls after generating steps
  }

  push() {
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

      const valueToPush = this.inputValue;
      this.items.push(valueToPush); // Actual data modification

      // Add the animation step for the "pushed" state
      this.animationSteps.push({
        array: [...this.items], // State of the stack AFTER push
        operation: "pushed",
        value: valueToPush,
        index: this.items.length - 1
      });

      this.inputValue = null;
      this.animate();
    }
  }

  pop() {
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

      const valueToPop = this.items[this.items.length - 1];
      const indexToPop = this.items.length - 1;

      // Step 1: Highlight the item to be popped
      this.animationSteps.push({
        array: [...this.items], // Current state of the stack (before actual pop)
        operation: "popping",
        value: valueToPop,
        index: indexToPop
      });

      this.items.pop(); // Actual data modification

      // Step 2: Show the stack after the item is popped
      this.animationSteps.push({
        array: [...this.items], // State of the stack AFTER pop
        operation: "state",     // Generic state, item is visually gone
      });

      this.animate();
    }
  }

  startAnimation() {
    if (this.isAnimating || this.isPaused) return;
    // Ensure animationSteps is fresh if starting from scratch
    if (this.currentStep === -1 || this.currentStep >= this.animationSteps.length -1) {
      this.generateStackSteps(); // Re-generate based on current items if at end or reset
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
    // isAnimating will be set to false by animate() if it stops due to pause
    this.isAnimating = false; // Explicitly set here too
    this.updateStepControls();
  }

  resumeAnimation() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.isAnimating = true;
    // currentStep should be valid from when it was paused
    if (this.currentStep < 0 || this.currentStep >= this.animationSteps.length) {
      this.currentStep = 0; // Or handle appropriately, e.g. find last sensible step
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
      this.items = []; // Or a predefined default initial stack
    }
    this.generateStackSteps(); // This will create an 'initial' step
    // Ensure items visual matches the initial step after reset
    if (this.animationSteps.length > 0) {
      this.items = [...this.animationSteps[0].array];
    }
    this.updateStepControls();
  }

  animate() {
    if (this.isPaused) {
      this.updateStepControls(); // Ensure UI reflects paused state
      return;
    }

    if (!this.isAnimating || this.currentStep < 0 || this.currentStep >= this.animationSteps.length) {
      this.isAnimating = false;
      // Ensure this.items reflects the final state
      if (this.animationSteps.length > 0) {
        if (this.currentStep >= this.animationSteps.length) {
          // Animation completed normally, currentStep is one past the last valid index
          this.items = [...this.animationSteps[this.animationSteps.length - 1].array];
        } else if (this.currentStep < 0) {
          // Animation was reset or not started, currentStep is -1
          // items should be set by resetAnimation or initial setup.
          // If animationSteps exists, show first step, else it's handled by reset.
          if (this.animationSteps[0]) this.items = [...this.animationSteps[0].array];
        } else {
          // Animation stopped mid-way by isAnimating = false; ensure items matches current step.
          this.items = [...this.animationSteps[this.currentStep].array];
        }
      }
      this.updateStepControls();
      return;
    }

    const step = this.animationSteps[this.currentStep];
    this.items = [...step.array]; // Display the current step's array configuration
    this.updateStepControls();

    setTimeout(() => {
      // Check flags again as they might have changed during the timeout (e.g., by pauseAnimation)
      if (this.isAnimating && !this.isPaused) {
        this.currentStep++;
        this.animate();
      } else if (this.isPaused) {
        // If paused during the timeout, ensure UI reflects the step at which it was paused.
        // this.items is already set, update controls.
        this.updateStepControls();
      } else if (!this.isAnimating) {
        // If animation was stopped (e.g. reset), ensure controls are updated.
        // The main loop's exit condition will handle setting final items state.
        this.updateStepControls();
      }
    }, this.actualDelay);
  }


  private get actualDelay(): number {
    return 1100 - this.animationSpeed;
  }

  onSpeedChange(event: any) { // MatSliderChange event if using (change) event
    // If using ngModel, animationSpeed is already updated.
    // If using (input) or (change) event on mat-slider:
    // this.animationSpeed = event.value;
  }

  saveInstance() {
    const dialogRef = this.dialog.open(SaveInstanceDialogComponent, {
      width: '300px',
      data: { name: '' }
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      if (result) {
        // Update selectedJsonconfig to current items state before saving
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
    // Update selectedJsonconfig to current items state before exporting
    this.selectedJsonconfig = JSON.stringify(this.items);
    const dataToExport = JSON.parse(this.selectedJsonconfig);
    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedInstance ? this.selectedInstance['name'] : 'stack-instance'}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  onConfigChange() { // This is bound to ngModelChange on a textarea or similar for selectedJsonconfig
    try {
      const newArray = JSON.parse(this.selectedJsonconfig);
      if (Array.isArray(newArray) && newArray.every(item => typeof item === 'number')) {
        if (this.selectedInstance) {
          this.selectedInstance.config = this.selectedJsonconfig;
        }
        this.items = newArray;
        this.resetAnimation(); // Reset animation with new base state
      } else {
        // Optionally provide user feedback for invalid format
        console.error('Invalid array format in config');
      }
    } catch (e) {
      console.error('无效的 JSON 格式:', e);
      // Optionally revert to last known good config or provide user feedback
    }
  }


  onInstanceChange(event: any) { // Assuming event is the selected instance object or its value
    if (this.selectedInstance && this.selectedInstance.config) {
      this.selectedJsonconfig = this.selectedInstance.config;
      this.items = JSON.parse(this.selectedJsonconfig);
      this.resetAnimation(); // Reset animation with new base state
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
    // this.onConfigChange(); // Call onConfigChange to update items and reset animation.
    // onConfigChange expects selectedJsonconfig to be editable by user,
    // so directly setting items and resetting is cleaner here.
    this.items = newArray;
    if (this.selectedInstance) { // Update current selected instance's config if one is selected
      this.selectedInstance.config = this.selectedJsonconfig;
    }
    this.resetAnimation(); // This will call generateStackSteps with the new items
  }

  stepBackward() {
    if (this.canStepBackward && this.currentStep > 0) { // Ensure currentStep > 0 for animationSteps access
      this.isAnimating = false; // Stop any ongoing animation
      this.isPaused = true;    // Enter paused state for stepping
      this.currentStep--;
      if (this.animationSteps[this.currentStep]) {
        this.items = [...this.animationSteps[this.currentStep].array];
      }
      this.updateStepControls();
    }
  }

  stepForward() {
    if (this.canStepForward && this.currentStep < this.animationSteps.length - 1) { // Ensure currentStep is valid
      this.isAnimating = false; // Stop any ongoing animation
      this.isPaused = true;    // Enter paused state for stepping
      this.currentStep++;
      if (this.animationSteps[this.currentStep]) {
        this.items = [...this.animationSteps[this.currentStep].array];
      }
      this.updateStepControls();
    }
  }

  private updateStepControls() {
    // currentStep can be -1 after reset, 0 to length-1 during animation/stepping
    this.canStepBackward = this.currentStep > 0 && this.animationSteps.length > 0;
    this.canStepForward = this.currentStep < this.animationSteps.length - 1;
  }

}
