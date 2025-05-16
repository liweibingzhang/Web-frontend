import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { MatOptionModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { materialModules } from '../../../../shared/material';

@Component({
  selector: 'app-animation-controller',
  imports: [...materialModules, MatSliderModule, MatOptionModule, FormsModule],
  templateUrl: './animation-controller.component.html',
  styleUrls: ['./animation-controller.component.css']
})
export class AnimationControllerComponent {
  @Input() animationSteps: Array<any> = [];
  @Input() generateSteps: () => void = () => {};
  @Input() resetAnimationSteps: () => void = () => {};
  @Input() updateAnimationSteps: (step: any) => void = () => {};
  isAnimating: boolean = false;
  isPaused: boolean = false;
  currentStep: number = -1;
  canStepBackward: boolean = false;
  canStepForward: boolean = false;
  animationSpeed: number = 500;

  startAnimation() {
    if (this.isAnimating || this.isPaused) return;
    this.resetAnimation();
    this.generateSteps();
    this.isAnimating = true;
    this.isPaused = false;
    this.currentStep = 0;
    this.animate();
  }

  pauseAnimation() {
    if (!this.isAnimating || this.isPaused) return;
    this.isPaused = true;
    this.isAnimating = false;
  }

  resumeAnimation() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.isAnimating = true;
    this.animate();
  }

  resetAnimation() {
    this.isAnimating = false;
    this.isPaused = false;
    this.currentStep = -1;
    this.resetAnimationSteps();
  }

  animate() {
    if (this.isPaused || !this.isAnimating || this.currentStep >= this.animationSteps.length) {
      if (this.currentStep >= this.animationSteps.length) {
        this.isAnimating = false;
        this.isPaused = false;
      }
      return;
    }

    const step = this.animationSteps[this.currentStep];
    this.currentStep = this.animationSteps.indexOf(step);
    this.updateAnimationSteps(step);
    this.canStepBackward = this.currentStep > 0;
    this.canStepForward = this.currentStep < this.animationSteps.length - 1;
    
    setTimeout(() => {
      this.currentStep++;
      this.animate();
    }, this.actualDelay);
  }

  get actualDelay(): number {
    return 1100 - this.animationSpeed;
  }

  onSpeedChange(speed: number) {
    this.animationSpeed = speed;
  }

  onStepForward() {
    if (this.currentStep < this.animationSteps.length - 1) {
      this.currentStep++;
      this.updateAnimationSteps(this.animationSteps[this.currentStep]);
      this.canStepBackward = this.currentStep > 0;
      this.canStepForward = this.currentStep < this.animationSteps.length - 1;
    }
  }

  onStepBackward() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateAnimationSteps(this.animationSteps[this.currentStep]);
      this.canStepBackward = this.currentStep > 0;
      this.canStepForward = this.currentStep < this.animationSteps.length - 1;
    }
  }
}
