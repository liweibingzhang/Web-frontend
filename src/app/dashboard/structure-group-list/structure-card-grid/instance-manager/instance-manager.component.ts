import { Component, EventEmitter, Output } from '@angular/core';
import { Instance } from '../../../../models/instance.model';
import { SaveInstanceDialogComponent } from '../save-instances-dialog/save-instances-dialog.component';
import { AiDialogComponent } from '../../../ai-dialog/ai-dialog.components';
import { MatDialog } from '@angular/material/dialog';
import { CommonService } from '../../../../services/common.service';
import { materialModules } from '../../../../shared/material';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-instance-manager',
  templateUrl: './instance-manager.component.html',
  styleUrl: './instance-manager.component.css',
  imports: [...materialModules, CommonModule, FormsModule, MatOptionModule],
  standalone: true
})
export class InstanceManagerComponent {
  instances: Instance[] = [];
  selectedInstance: Instance | null = null;
  selectedJsonconfig: string = '';
  componentId: number | null = null;

  @Output() configUpdated = new EventEmitter<{
    instance: Instance | null,
    config: string
  }>();

  @Output() generateRandomConfig = new EventEmitter<void>();

  constructor(
    private commonService: CommonService,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) {
    this.componentId = Number(this.route.snapshot.paramMap.get("componentId"));
    this.updateInstances();
  }

  updateInstances(defaultConfig?: any) {
    this.commonService.selectInstanceByComponentId(this.componentId!).subscribe({
      next: (data: any) => {
        this.instances = data;
        if (defaultConfig) {
          this.instances.unshift({
            'name': 'default-instance',
            'config': JSON.stringify(defaultConfig)
          });
        }
        this.selectedInstance = this.instances[0];
        this.selectedJsonconfig = this.selectedInstance?.config || '';
        this.emitUpdate();
      },
      error: (err: any) => {
        console.log(err.error);
      }
    });
  }

  private emitUpdate() {
    this.configUpdated.emit({
      instance: this.selectedInstance,
      config: this.selectedJsonconfig
    });
  }

  onInstanceChange(event: any) {
    this.selectedJsonconfig = this.selectedInstance!.config;
    this.emitUpdate();
  }

  onConfigChange() {
    try {
      JSON.parse(this.selectedJsonconfig);
      if (this.selectedInstance) {
        this.selectedInstance.config = this.selectedJsonconfig;
        this.emitUpdate();
      }
    } catch (e) {
      console.error('无效的 JSON 格式:', e);
    }
  }

  saveInstance() {
    const dialogRef = this.dialog.open(SaveInstanceDialogComponent, {
      width: '300px',
      data: { name: '' }
    });

    dialogRef.afterClosed().subscribe((result: string | undefined) => {
      if (result) {
        const insertedInstance = {
          "component_id": this.componentId,
          "name": result,
          "config": this.selectedJsonconfig
        };
        this.commonService.insertInstance(insertedInstance).subscribe({
          next: () => {
            alert('保存成功');
            this.updateInstances();
          },
          error: () => alert('保存失败')
        });
      }
    });
  }

  deleteInstance(instance: any) {
    if ('id' in instance) {
      this.commonService.deleteInstanceById(instance.id).subscribe({
        next: () => {
          alert('删除成功');
          this.updateInstances();
        },
        error: () => alert('删除失败')
      });
    } else {
      alert('不能删除默认实例');
    }
  }

  exportInstance() {
    const dataToExport = JSON.parse(this.selectedJsonconfig);
    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedInstance!.name}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  aiHelper() {
    this.dialog.open(AiDialogComponent, {
      width: '300px',
      data: {}
    });
  }

  generateRandom() {
    this.generateRandomConfig.emit();
  }
}
