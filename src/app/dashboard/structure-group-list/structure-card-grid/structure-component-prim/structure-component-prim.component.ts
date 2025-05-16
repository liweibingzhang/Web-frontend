import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Graph } from '@antv/g6';
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
import { InstanceManagerComponent } from '../instance-manager/instance-manager.component';
import { AnimationControllerComponent } from '../animation-controller/animation-controller.component';
import { MyComponent } from '../../../../models/component.model';

@Component({
  selector: 'app-structure-component-prim',
  imports: [
    CommonModule, 
    FormsModule, 
    ...materialModules, 
    MatSliderModule, 
    MatExpansionModule, 
    MatTabsModule,
    InstanceManagerComponent,
    AnimationControllerComponent
  ],
  templateUrl: './structure-component-prim.component.html',
  styleUrl: './structure-component-prim.component.css'
})
export class PrimComponent implements OnInit, AfterViewInit {
  @ViewChild(InstanceManagerComponent) instanceManager!: InstanceManagerComponent;
  @ViewChild(AnimationControllerComponent) animationController!: AnimationControllerComponent;
  
  isLoggedIn: boolean = false;
  user: any;
  group: any;
  component: MyComponent | null = null;
  
  graph!: Graph;
  startNode: string = '0'; // 起始节点
  availableNodes: Array<{id: string, label: string}> = []; // 存储可选节点的列表
  weightMatrix: number[][] = []; // 权重矩阵
  nodeMapping: Map<string, number> = new Map(); // 节点ID到矩阵索引的映射

  animationSteps: Array<{
    visitedNodes: string[];
    currentNode: string | null;
    mstEdges: Array<{source: string, target: string, weight: number}>; // 最小生成树的边
    priorityQueue: Array<{source: string, target: string, weight: number}>; // 优先队列中的边
    minEdge: {source: string, target: string, weight: number} | null; // 当前选择的最小权重边
  }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private commonService: CommonService
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
      }
    });
    // 绑定方法到当前组件实例
    this.generatePrimSteps = this.generatePrimSteps.bind(this);
    this.resetAnimationSteps = this.resetAnimationSteps.bind(this);
    this.updateAnimationSteps = this.updateAnimationSteps.bind(this);
  }

  ngAfterViewInit() {
    // initGraph
    this.graph = new Graph({
      container: 'prim-container',
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],  // 允许拖拽画布和节点，缩放画布
      node: {
        style: {
          size: 30,
          x: (d) => d['x'] as number,
          y: (d) => d['y'] as number,
          lineWidth: 1,
          labelText: (d) => d['label'] as string,
        }
      },
      edge: {
        style: {
          endArrow: false,
          lineWidth: 2,
          labelText: (d) => d['weight']?.toString() || '',
        }
      },
      autoFit: 'view', // 自动适应视图
      padding: [30, 30, 30, 30] // 四周留出一定的边距
    });

    // 设置默认配置
    const defaultConfig = {
      "nodes": [
        { "id": "0", "label": "A", "x": 100, "y": 100 },
        { "id": "1", "label": "B", "x": 200, "y": 200 },
        { "id": "2", "label": "C", "x": 300, "y": 100 },
        { "id": "3", "label": "D", "x": 400, "y": 200 }
      ],
      "edges": [
        { "source": "0", "target": "1", "weight": 1 },
        { "source": "0", "target": "2", "weight": 4 },
        { "source": "1", "target": "2", "weight": 2 },
        { "source": "1", "target": "3", "weight": 5 },
        { "source": "2", "target": "3", "weight": 1 }
      ]
    };
    // 更新实例
    this.instanceManager.updateInstances(defaultConfig);
  }

  onConfigUpdated(event: { instance: Instance | null, config: string }) {
    try {
      const graphData = JSON.parse(event.config);
      
      graphData.nodes.forEach((node: any, index: number) => {
        if (node.x === undefined || node.y === undefined) {
          // 如果节点没有坐标，分配一个默认位置
          node.x = 100 + (index % 3) * 200;
          node.y = 100 + Math.floor(index / 3) * 150;
        }
      });
      
      this.graph.setData(graphData);
      this.renderGraph(); // 渲染图形
      this.buildWeightMatrix(graphData); // 构建权重矩阵
      this.generatePrimSteps();
      // 更新可选节点列表
      this.availableNodes = graphData.nodes.map((node: any) => ({
        id: node.id,
        label: node.label || node.id
      }));
      if (!this.availableNodes.some(node => node.id === this.startNode) && this.availableNodes.length > 0) {
        this.startNode = this.availableNodes[0].id;
      }
    } catch (e) {
      console.error('无效的图形配置格式:', e);
    }
  }

  buildWeightMatrix(graphData: any) {
    // 重置节点映射
    this.nodeMapping = new Map();
    
    // 为每个节点分配索引
    graphData.nodes.forEach((node: any, index: number) => {
      this.nodeMapping.set(node.id, index);
    });
    
    // 初始化权重矩阵为无穷大
    const n = graphData.nodes.length;
    this.weightMatrix = Array(n).fill(0).map(() => Array(n).fill(Number.POSITIVE_INFINITY));
    
    // 设置自身到自身的距离为0
    for (let i = 0; i < n; i++) {
      this.weightMatrix[i][i] = 0;
    }
    
    // 填充权重矩阵
    graphData.edges.forEach((edge: any) => {
      const sourceIdx = this.nodeMapping.get(edge.source);
      const targetIdx = this.nodeMapping.get(edge.target);
      if (sourceIdx !== undefined && targetIdx !== undefined) {
        // 使用边的权重，如果没有则默认为1
        const weight = edge.weight || 1;
        this.weightMatrix[sourceIdx][targetIdx] = weight;
        // 如果是无向图，则双向设置
        if (!edge.directed) {
          this.weightMatrix[targetIdx][sourceIdx] = weight;
        }
      }
    });
  }

  generatePrimSteps = () => {
    if (!this.instanceManager.selectedJsonconfig) return;
    this.animationSteps = [];
    
    const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
    const nodeCount = graphData.nodes.length;
    if (nodeCount === 0) return;
    
    // 构建邻接表
    const adjacencyList = new Map<string, Array<{target: string, weight: number}>>();
    graphData.nodes.forEach((node: any) => {
      adjacencyList.set(node.id, []);
    });
    
    graphData.edges.forEach((edge: any) => {
      const weight = edge.weight || 1;
      adjacencyList.get(edge.source)?.push({target: edge.target, weight});
      // 无向图需要双向添加
      if (!edge.directed) {
        adjacencyList.get(edge.target)?.push({target: edge.source, weight});
      }
    });
    
    // Prim 算法实现
    const visited = new Set<string>();
    const mstEdges: Array<{source: string, target: string, weight: number}> = [];
    let priorityQueue: Array<{source: string, target: string, weight: number}> = [];
    
    // 从起始节点开始
    visited.add(this.startNode);
    
    // 将起始节点的所有边加入优先队列
    adjacencyList.get(this.startNode)?.forEach(edge => {
      priorityQueue.push({
        source: this.startNode,
        target: edge.target,
        weight: edge.weight
      });
    });
    
    // 记录初始状态
    this.animationSteps.push({
      visitedNodes: Array.from(visited),
      currentNode: this.startNode,
      mstEdges: [],
      priorityQueue: [...priorityQueue],
      minEdge: null
    });
    
    // 主循环
    while (priorityQueue.length > 0 && visited.size < nodeCount) {
      // 按权重排序优先队列
      priorityQueue.sort((a, b) => a.weight - b.weight);
      
      // 取出权重最小的边
      const minEdge = priorityQueue.shift()!;
      
      // 如果目标节点已访问，跳过
      if (visited.has(minEdge.target)) continue;
      
      // 将目标节点标记为已访问
      visited.add(minEdge.target);
      
      // 将边加入MST
      mstEdges.push(minEdge);
      
      // 记录当前步骤
      this.animationSteps.push({
        visitedNodes: Array.from(visited),
        currentNode: minEdge.target,
        mstEdges: [...mstEdges],
        priorityQueue: [...priorityQueue],
        minEdge: {...minEdge}
      });
      
      // 将新节点的所有边加入优先队列
      adjacencyList.get(minEdge.target)?.forEach(edge => {
        if (!visited.has(edge.target)) {
          priorityQueue.push({
            source: minEdge.target,
            target: edge.target,
            weight: edge.weight
          });
        }
      });
      
      // 记录更新优先队列后的步骤
      if (priorityQueue.length > 0) {
        this.animationSteps.push({
          visitedNodes: Array.from(visited),
          currentNode: minEdge.target,
          mstEdges: [...mstEdges],
          priorityQueue: [...priorityQueue],
          minEdge: null
        });
      }
    }
  }

  resetAnimationSteps = () => {
    this.animationSteps = [];
    const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
    this.graph.setData(graphData);
    this.renderGraph();
    
    this.generatePrimSteps();
  }

  updateAnimationSteps = (step: any) => {
    this.renderGraph(step.visitedNodes, step.currentNode, step.mstEdges, step.minEdge);
  }

  renderGraph(visitedNodes: string[] = [], currentNode: string | null = null, 
              mstEdges: Array<{source: string, target: string, weight: number}> = [], 
              minEdge: {source: string, target: string, weight: number} | null = null) {
    if (!this.instanceManager.selectedJsonconfig) return;
    
    const { nodes, edges } = JSON.parse(this.instanceManager.selectedJsonconfig);
    
    // 节点样式
    nodes.forEach((node: any) => {
      node.style = {
        fill: currentNode === node.id 
          ? '#ff6b6b' // 当前节点
          : visitedNodes.includes(node.id)
            ? '#4ecdc4' // 已访问节点
            : '#6c5ce7', // 未访问节点
        stroke: '#ffffff',
        size: currentNode === node.id ? 40 : visitedNodes.includes(node.id) ? 35 : 30,
        labelFontSize: 16,
        labelFill: '#ffffff',
        labelPlacement: 'center',
      };
    });
    
    // 边的样式
    edges.forEach((edge: any) => {
      // 检查边是否在MST中
      const isInMST = mstEdges.some(e => 
        (e.source === edge.source && e.target === edge.target) || 
        (e.source === edge.target && e.target === edge.source)
      );
      
      // 检查是否为当前选择的最小边
      const isMinEdge = minEdge && 
        ((minEdge.source === edge.source && minEdge.target === edge.target) || 
         (minEdge.source === edge.target && minEdge.target === edge.source));
      
      edge.style = {
        stroke: isMinEdge ? '#ff6b6b' : isInMST ? '#4ecdc4' : '#aaaaaa',
        labelFontSize: 20,
      };
    });
    
    this.graph.setData({ nodes, edges });
    this.graph.render();
  }

  getPrimDescription(): { algorithm: string, visualization: string } {
    return {
      algorithm: `Prim算法的时间复杂度为 O(ElogV)
具体步骤：
1. 初始化：选择一个起始节点，将其加入MST
2. 将起始节点的所有边加入优先队列
3. 从优先队列中选择权重最小的边，如果该边连接的节点已在MST中则跳过
4. 将选中的边加入MST，将目标节点标记为已访问
5. 将新加入节点的所有边（连接到未访问节点）加入优先队列
6. 重复步骤3-5，直到所有节点都被访问或优先队列为空`,
      visualization: `
- 紫色节点：未访问节点
- 绿色节点：已加入MST的节点
- 红色节点：当前正在处理的节点
- 绿色边：已加入MST的边
- 红色边：当前选择的最小权重边
- 灰色边：未加入MST的边`
    }
  }

  onGenerateRandom() {
    const nodeCount = Math.floor(Math.random() * 5) + 5; // 5-10个节点
    const nodes = [];
    const edges = [];
    
    // 创建节点
    for (let i = 0; i < nodeCount; i++) {
      // 使用圆形布局分配坐标
      const angle = (i / nodeCount) * 2 * Math.PI;
      const radius = 200; // 圆的半径
      const x = 400 + radius * Math.cos(angle); // 中心点x=400
      const y = 300 + radius * Math.sin(angle); // 中心点y=300
      
      nodes.push({
        id: i.toString(),
        label: String.fromCharCode(65 + i), // A, B, C...
        x: x,
        y: y
      });
    }
    
    // 创建边（确保图是连通的）
    // 首先确保每个节点至少有一条边
    for (let i = 1; i < nodeCount; i++) {
      const source = Math.floor(Math.random() * i);
      const weight = Math.floor(Math.random() * 9) + 1; // 1-10的权重
      edges.push({
        source: source.toString(),
        target: i.toString(),
        label: weight.toString(),
        weight: weight
      });
    }
    
    // 再添加一些随机边
    const extraEdges = Math.floor(Math.random() * nodeCount);
    for (let i = 0; i < extraEdges; i++) {
      const source = Math.floor(Math.random() * nodeCount);
      let target = Math.floor(Math.random() * nodeCount);
      // 确保不自环
      while (target === source) {
        target = Math.floor(Math.random() * nodeCount);
      }
      // 确保不重复
      if (!edges.some(e => 
        (e.source === source.toString() && e.target === target.toString()) ||
        (e.source === target.toString() && e.target === source.toString())
      )) {
        const weight = Math.floor(Math.random() * 9) + 1; // 1-10的权重
        edges.push({
          source: source.toString(),
          target: target.toString(),
          label: weight.toString(),
          weight: weight
        });
      }
    }
    
    const graphData = { nodes, edges };
    
    this.instanceManager.selectedJsonconfig = JSON.stringify(graphData);
    this.onConfigUpdated({ instance: null, config: JSON.stringify(graphData) });
  }

  get Array() {
    return Array;
  }

  get Infinity() {
    return Number.POSITIVE_INFINITY;
  }

  getNodeLabelByIndex(index: number): string {
    // 先通过索引找到节点ID
    let nodeId = '';
    for (const [id, nodeIndex] of this.nodeMapping.entries()) {
      if (nodeIndex === index) {
        nodeId = id;
        break;
      }
    }
    
    if (!nodeId || !this.instanceManager.selectedJsonconfig) return nodeId;
    
    // 再通过节点ID找到节点标签
    const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
    const node = graphData.nodes.find((n: any) => n.id === nodeId);
    return node ? node.label : nodeId;
  }

  getTotalWeight(edges: Array<{source: string, target: string, weight: number}>): number {
    return edges.reduce((sum, edge) => sum + edge.weight, 0);
  }

  getTotalNodes(): number {
    if (!this.instanceManager || !this.instanceManager.selectedJsonconfig) return 0;
    
    try {
      const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
      return graphData.nodes.length;
    } catch (e) {
      console.error('获取总节点数时出错:', e);
      return 0;
    }
  }

}
