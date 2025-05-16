import { Component, AfterViewInit, OnInit } from '@angular/core';
import { Graph } from '@antv/g6';
import { AvlTreeService } from './structure-component-avl.service'; // Changed import
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { materialModules } from '../../../../shared/material';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { CommonService } from '../../../../services/common.service';
import { MatDialog } from '@angular/material/dialog';
import { Instance } from '../../../../models/instance.model';
import { SaveInstanceDialogComponent } from '../save-instances-dialog/save-instances-dialog.component';
import { AiDialogComponent } from '../../../ai-dialog/ai-dialog.components';

@Component({
  selector: 'app-structure-component-avl', // Changed selector
  imports: [CommonModule, FormsModule, ...materialModules],
  templateUrl: './structure-component-avl.html',
  styleUrl: './structure-component-avl.css'
})
export class AvlVisualizerComponent implements AfterViewInit, OnInit { // Changed class name
  value = '';
  graph!: Graph;
  isLoggedIn: boolean = false;
  user: any;
  group: any;
  component: any;
  instances: Instance[] = [];
  selectedInstance: Instance | null = null;
  selectedJsonconfig: string = '';
  avlTree: AvlTreeService = new AvlTreeService(); // Changed service instance

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


  }

  ngAfterViewInit() {
    this.graph = new Graph({
      container: 'bst-container', // Keep container ID for now, can be changed in HTML
      width: 800,
      height: 600,
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
      node: {
        style: {
          size: 10,
          x: (d) => d['x'] as number,
          y: (d) => d['y'] as number,
          labelText: (d) => d['label'] as string,
        },
        palette: {
          field: 'group',
          color: 'tableau',
        },
      },
      layout: {
        type: "antv-dagre",
        direction: "TB"
      }
    });
  }
  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService, private commonService: CommonService, private dialog: MatDialog) { }

  updateInstances(){
    const componentId = this.route.snapshot.paramMap.get("componentId");
    this.commonService.selectInstanceByComponentId(Number(componentId)).subscribe({
      next: (data: any) => {
        console.log(data);
        this.instances = data;
        const defaultConfig =
          {
            "nodes": [
              { "id": "0", "label": "8", "x": 300, "y": 100 },
              { "id": "1", "label": "3", "x": 200, "y": 200 },
              { "id": "2", "label": "10", "x": 400, "y": 200 },
              { "id": "3", "label": "1", "x": 150, "y": 300 },
              { "id": "4", "label": "6", "x": 250, "y": 300 },
              { "id": "5", "label": "14", "x": 470, "y": 300 },
              { "id": "6", "label": "4", "x": 230, "y": 400 },
              { "id": "7", "label": "7", "x": 270, "y": 400 },
              { "id": "8", "label": "13", "x": 450, "y": 400 }
            ],
            "edges": [
              { "source": "0", "target": "1" },
              { "source": "0", "target": "2" },
              { "source": "1", "target": "3" },
              { "source": "1", "target": "4" },
              { "source": "2", "target": "5" },
              { "source": "4", "target": "6" },
              { "source": "4", "target": "7" },
              { "source": "5", "target": "8" }
            ]
          }

        this.instances.unshift({'name': 'default-instance', 'config': JSON.stringify(defaultConfig)});
        this.selectedInstance = this.instances[0];
        this.selectedJsonconfig = this.instances[0]['config'];
        this.avlTree = new AvlTreeService(JSON.parse(this.selectedJsonconfig)); // Changed service instance
        this.graph.setData(this.avlTree.toGraphData()) // Changed service instance
        this.renderGraph();
      },
      error: (err: any) =>{
        console.log(err.error);
      }
    });
  }

  onInstanceChange(event: any){
    this.selectedJsonconfig = this.selectedInstance!['config'];
    this.avlTree = new AvlTreeService(JSON.parse(this.selectedJsonconfig)); // Changed service instance
    this.graph.setData(this.avlTree.toGraphData()) // Changed service instance
    this.renderGraph();
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

    const json = JSON.stringify(dataToExport, null, 2); // Format
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedInstance!['name']}.json`;
    a.click();

    URL.revokeObjectURL(url); // Clean up resource
  }

  aiHelper(){
    const dialogRef = this.dialog.open(AiDialogComponent, {
      width: '300px',
      data: { }
    });
  }

  onConfigChange(){
    try {
      JSON.parse(this.selectedJsonconfig);
      this.selectedInstance!.config = this.selectedJsonconfig;
    } catch (e) {
      console.error('Invalid JSON format:', e);
    }
  }

  insert(): void {
    const num = Number(this.value);
    if (!isNaN(num)) {
      this.avlTree.insert(num); // Changed service instance
      const graphDat = this.avlTree.toGraphData(); // Changed service instance
      this.selectedJsonconfig = JSON.stringify(graphDat);;
      this.renderGraph();
      this.value = '';
    }
  }

  search(): void {
    const num = Number(this.value);
    const path = this.avlTree.searchPath(num); // Changed service instance
    const ids = path.map(n => n.id);
    this.renderGraph(ids);
  }

  renderGraph(highlightIds: string[] = []): void {
    const { nodes, edges } = this.avlTree.toGraphData(); // Changed service instance
    nodes.forEach(node => {
      node.style = {
        fill: highlightIds.includes(node.id) ? '#e74c3c' : '#1890ff',
      };
    });
    this.graph.setData({ nodes, edges });
    this.graph.render();
  }
}
