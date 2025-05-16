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
  selector: 'app-structure-component-dijkstra',
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
  templateUrl: './structure-component-dijkstra.component.html',
  styleUrl: './structure-component-dijkstra.component.css'
})
export class DijkstraComponent implements OnInit, AfterViewInit {
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
    visitedNodes: string[]; // 已访问的节点
    currentNode: string | null; // 当前正在处理的节点
    distances: Map<string, number>; // 从起点到各节点的距离
    previous: Map<string, string | null>; // 最短路径中各节点的前驱节点
    priorityQueue: Array<[string, number]>; // 优先队列 [节点ID, 距离]
    shortestPath: string[]; // 最短路径
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
    this.generateDijkstraSteps = this.generateDijkstraSteps.bind(this);
    this.resetAnimationSteps = this.resetAnimationSteps.bind(this);
    this.updateAnimationSteps = this.updateAnimationSteps.bind(this);
  }

  ngAfterViewInit() {
    // initGraph
    this.graph = new Graph({
      container: 'dijkstra-container',
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
      this.generateDijkstraSteps();
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

  generateDijkstraSteps = () => {
    if (!this.instanceManager?.selectedJsonconfig) return;
    this.animationSteps = [];
    
    try {
      const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
      
      // 构建邻接表
      const adjacencyList = new Map<string, {target: string, weight: number}[]>();
      graphData.nodes.forEach((node: any) => {
        adjacencyList.set(node.id, []);
      });
      
      graphData.edges.forEach((edge: any) => {
        const weight = edge.weight || 1;
        adjacencyList.get(edge.source)?.push({target: edge.target, weight});
        // 如果是无向图，则双向添加
        if (!edge.directed) {
          adjacencyList.get(edge.target)?.push({target: edge.source, weight});
        }
      });
      
      const startNodeId = this.startNode;
      
      // 初始化距离和前驱节点
      const distances = new Map<string, number>();
      const previous = new Map<string, string | null>();
      const visited = new Set<string>();
      
      // 初始化所有节点的距离为无穷大
      graphData.nodes.forEach((node: any) => {
        distances.set(node.id, node.id === startNodeId ? 0 : Number.POSITIVE_INFINITY);
        previous.set(node.id, null);
      });
      
      // 使用优先队列（这里简化为数组）
      let priorityQueue: Array<[string, number]> = [[startNodeId, 0]];
      
      // 记录初始状态
      this.animationSteps.push({
        visitedNodes: Array.from(visited),
        currentNode: null,
        distances: new Map(distances),
        previous: new Map(previous),
        priorityQueue: [...priorityQueue],
        shortestPath: []
      });
      
      while (priorityQueue.length > 0) {
        // 按距离排序优先队列
        priorityQueue.sort((a, b) => a[1] - b[1]);
        
        // 取出距离最小的节点
        const [currentNode, currentDistance] = priorityQueue.shift()!;
        
        // 如果节点已访问，跳过
        if (visited.has(currentNode)) continue;
        
        // 标记为已访问
        visited.add(currentNode);
        
        // 记录当前步骤
        this.animationSteps.push({
          visitedNodes: Array.from(visited),
          currentNode: currentNode,
          distances: new Map(distances),
          previous: new Map(previous),
          priorityQueue: [...priorityQueue],
          shortestPath: this.reconstructPath(previous, currentNode)
        });
        
        // 遍历当前节点的所有邻居
        const neighbors = adjacencyList.get(currentNode) || [];
        for (const {target, weight} of neighbors) {
          if (visited.has(target)) continue;
          
          // 计算通过当前节点到达邻居的新距离
          const newDistance = (distances.get(currentNode) || 0) + weight;
          
          // 如果新距离更短，则更新距离和前驱节点
          if (newDistance < (distances.get(target) || Number.POSITIVE_INFINITY)) {
            distances.set(target, newDistance);
            previous.set(target, currentNode);
            
            // 将邻居加入优先队列
            priorityQueue.push([target, newDistance]);
            
            // 记录更新步骤
            this.animationSteps.push({
              visitedNodes: Array.from(visited),
              currentNode: target,
              distances: new Map(distances),
              previous: new Map(previous),
              priorityQueue: [...priorityQueue],
              shortestPath: this.reconstructPath(previous, target)
            });
          }
        }
      }
      
      // 添加最终状态
      this.animationSteps.push({
        visitedNodes: Array.from(visited),
        currentNode: null,
        distances: new Map(distances),
        previous: new Map(previous),
        priorityQueue: [],
        shortestPath: []
      });
    } catch (e) {
      console.error('生成Dijkstra步骤时出错:', e);
    }
  }
  
  // 重建从起点到目标节点的路径
  reconstructPath(previous: Map<string, string | null>, target: string): string[] {
    const path: string[] = [];
    let current: string | null = target;
    
    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }
    
    return path;
  }

  resetAnimationSteps = () => {
    this.animationSteps = [];
    const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
    this.graph.setData(graphData);
    this.renderGraph();
    this.generateDijkstraSteps();
  }

  updateAnimationSteps = (step: any) => {
    this.renderGraph(step.visitedNodes, step.currentNode, step.shortestPath);
  }

  renderGraph(visitedNodes: string[] = [], currentNode: string | null = null, shortestPath: string[] = []) {
    if (!this.instanceManager.selectedJsonconfig) return;
    
    const { nodes, edges } = JSON.parse(this.instanceManager.selectedJsonconfig);
    // 更新节点样式
    nodes.forEach((node: any) => {
      node.style = {
        fill: currentNode === node.id 
          ? '#e74c3c' // 当前节点为红色
          : shortestPath.includes(node.id)
            ? '#ff9800' // 最短路径节点为橙色
            : '#1890ff',
        stroke: '#fff',
        size: shortestPath.includes(node.id) || currentNode === node.id || node.id === this.startNode ? 35 : 30,
        labelFontSize: 16,
        labelFill: '#ffffff', // 设置标签字体为白色
        labelPlacement: 'center', // 将标签放在节点中央
      };
    });
    
    // 获取当前步骤中所有已找到最短路径的节点
    const allShortestPaths: string[][] = [];
    if (this.animationController.currentStep >= 0 && this.animationController.currentStep < this.animationSteps.length) {
      const step = this.animationSteps[this.animationController.currentStep];
      // 为每个已访问的节点构建最短路径
      visitedNodes.forEach(nodeId => {
        const path = this.reconstructPath(step.previous, nodeId);
        if (path.length > 1) { // 只有路径长度大于1才添加（即不是起始节点自身）
          allShortestPaths.push(path);
        }
      });
    }
    
    // 更新边样式
    edges.forEach((edge: any) => {
      // 检查边是否在任何最短路径中
      const isInAnyShortestPath = allShortestPaths.some(path => {
        for (let i = 0; i < path.length - 1; i++) {
          if (path[i] === edge.source && path[i + 1] === edge.target ||
              path[i] === edge.target && path[i + 1] === edge.source) {
            return true;
          }
        }
        return false;
      });
      
      // 当前选中节点的最短路径边
      const isCurrentShortestPathEdge = shortestPath.includes(edge.source) && 
                                shortestPath.includes(edge.target) &&
                                Math.abs(shortestPath.indexOf(edge.target) - shortestPath.indexOf(edge.source)) === 1;
      
      edge.style = {
        stroke: isCurrentShortestPathEdge || isInAnyShortestPath ? '#ff69b4' : '#666', 
        labelFontSize: 20,
      };
    });
    
    this.graph.setData({ nodes, edges });
    this.graph.render();
  }

  getDijkstraDescription(): { algorithm: string, visualization: string } {
    return {
      algorithm: `Dijkstra算法的时间复杂度为 O(ElogV)
具体步骤：
1. 初始化：将起点距离设为0，其他节点距离设为无穷大
2. 选择未访问节点中距离最小的节点作为当前节点
3. 更新当前节点的所有邻居节点的距离
4. 标记当前节点为已访问
5. 重复步骤2-4，直到所有节点都被访问或目标节点被访问`,
      visualization: `
可视化元素说明：
- 红色节点：当前正在处理的节点
- 橙色节点：已找到最短路径的节点
- 粉色边：最短路径
`
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

  getUniqueSteps() {
    if (this.animationController.currentStep < 0 || this.animationSteps.length === 0) return [];
    
    // 获取当前步骤之前的所有步骤
    const steps = this.animationSteps.slice(0, this.animationController.currentStep + 1);
    const uniqueSteps: typeof steps = [];
    const seenDistances = new Map<string, string>();
    
    // 过滤掉距离相同的步骤
    for (const step of steps) {
      // 创建距离的字符串表示用于比较
      const distanceKey = Array.from(step.distances.entries())
        .map(([node, dist]) => `${node}:${dist}`)
        .join('|');
      
      // 如果这个距离组合没见过，或者是当前步骤，则添加
      if (!seenDistances.has(distanceKey) || step === steps[steps.length - 1]) {
        seenDistances.set(distanceKey, distanceKey);
        uniqueSteps.push(step);
      }
    }
    
    return uniqueSteps;
  }

}
