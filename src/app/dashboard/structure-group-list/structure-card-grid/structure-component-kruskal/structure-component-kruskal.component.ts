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
  selector: 'app-structure-component-kruskal',
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
  templateUrl: './structure-component-kruskal.component.html',
  styleUrl: './structure-component-kruskal.component.css'
})
export class KruskalComponent implements OnInit, AfterViewInit {
  @ViewChild(InstanceManagerComponent) instanceManager!: InstanceManagerComponent;
  @ViewChild(AnimationControllerComponent) animationController!: AnimationControllerComponent;
  
  isLoggedIn: boolean = false;
  user: any;
  group: any;
  component: MyComponent | null = null;
  
  graph!: Graph;
  weightMatrix: number[][] = []; // 权重矩阵
  nodeMapping: Map<string, number> = new Map(); // 节点ID到矩阵索引的映射

  animationSteps: Array<{
    visitedNodes: string[];
    currentNode: string | null;
    mstEdges: Array<{source: string, target: string, weight: number}>;
    minEdge: {source: string, target: string, weight: number} | null;
    disjointSets: Map<string, string>; // 并查集状态
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
    this.generateKruskalSteps = this.generateKruskalSteps.bind(this);
    this.resetAnimationSteps = this.resetAnimationSteps.bind(this);
    this.updateAnimationSteps = this.updateAnimationSteps.bind(this);
  }

  ngAfterViewInit() {
    // initGraph
    this.graph = new Graph({
      container: 'kruskal-container',
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
      this.generateKruskalSteps();
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

  generateKruskalSteps = () => {
    if (!this.instanceManager.selectedJsonconfig) return;
    
    this.animationSteps = [];
    
    const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
    const { nodes, edges } = graphData;
    
    // 初始化并查集
    const disjointSets = new Map<string, string>();
    nodes.forEach((node: any) => {
      disjointSets.set(node.id, node.id); // 每个节点初始为自己的父节点
    });
    
    // 查找函数 - 带路径压缩
    const find = (x: string): string => {
      if (disjointSets.get(x) !== x) {
        disjointSets.set(x, find(disjointSets.get(x)!));
      }
      return disjointSets.get(x)!;
    };
    
    // 合并函数
    const union = (x: string, y: string): void => {
      const rootX = find(x);
      const rootY = find(y);
      if (rootX !== rootY) {
        disjointSets.set(rootY, rootX);
      }
    };
    
    // 按权重排序所有边
    const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
    
    // 记录初始状态
    this.animationSteps.push({
      visitedNodes: [],
      currentNode: null,
      mstEdges: [],
      minEdge: null,
      disjointSets: new Map(disjointSets)
    });
    
    // 最小生成树的边
    const mstEdges: Array<{source: string, target: string, weight: number}> = [];
    
    // 遍历所有边
    for (const edge of sortedEdges) {
      const { source, target, weight } = edge;
      
      // 检查是否会形成环
      if (find(source) !== find(target)) {
        // 不会形成环，加入MST
        mstEdges.push({ source, target, weight });
        
        // 合并两个集合
        union(source, target);
        
        // 记录当前步骤
        this.animationSteps.push({
          visitedNodes: [...mstEdges.flatMap(e => [e.source, e.target])],
          currentNode: target,
          mstEdges: [...mstEdges],
          minEdge: { source, target, weight },
          disjointSets: new Map(disjointSets)
        });
      } else {
        // 会形成环，记录被跳过的边
        this.animationSteps.push({
          visitedNodes: [...mstEdges.flatMap(e => [e.source, e.target])],
          currentNode: null,
          mstEdges: [...mstEdges],
          minEdge: { source, target, weight },
          disjointSets: new Map(disjointSets)
        });
      }
    }
  }

  resetAnimationSteps = () => {
    this.animationSteps = [];
    
    if (this.instanceManager.selectedJsonconfig) {
      const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
      this.graph.setData(graphData);
      this.renderGraph();
      this.generateKruskalSteps();
    }
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
        labelPlacement: 'center', // 将标签放在节点中央
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

  getKruskalDescription(): { algorithm: string, visualization: string } {
    return {
      algorithm: `Kruskal算法是一种用于求解最小生成树（MST）的经典贪心算法
Kruskal算法的时间复杂度为 O(ElogE)
具体步骤：
1. 初始化：将所有边按权重排序
2. 初始化并查集，每个节点为独立集合
3. 按权重从小到大遍历所有边
4. 如果边的两个端点不在同一个集合中，则加入MST并合并集合
5. 重复步骤3-4，直到选择了n-1条边或遍历完所有边`,
      visualization: `可视化元素说明：
- 紫色节点：未加入MST的节点
- 绿色节点：已加入MST的节点
- 红色节点：当前正在处理的节点
- 绿色边：已加入MST的边
- 红色边：当前正在考虑的边
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
    
    // 然后通过节点ID找到节点的标签
    return this.getNodeLabelById(nodeId);
  }

  getNodeLabelById(id: string): string {
    if (!this.instanceManager.selectedJsonconfig) return id;
    
    const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
    const node = graphData.nodes.find((n: any) => n.id === id);
    return node ? node.label : id;
  }

  getDisjointSetsData(): {
    array: Array<{node: string, parent: string, root: string}>,
    groups: Array<{root: string, members: string[]}>
  } {
    // 修改条件判断，确保即使在动画结束后也能显示最后一步的并查集状态
    if (this.animationSteps.length === 0) {
      return { array: [], groups: [] };
    }
    
    // 获取当前步骤或最后一步的并查集状态
    const currentStep = this.animationController.currentStep;
    const disjointSets = currentStep >= 0 && currentStep < this.animationSteps.length 
      ? this.animationSteps[currentStep].disjointSets
      : this.animationSteps[this.animationSteps.length - 1].disjointSets;
    
    const array: Array<{node: string, parent: string, root: string}> = [];
    const groupsMap: Map<string, string[]> = new Map();
    
    // 查找函数 - 不带路径压缩，仅用于展示
    const findRoot = (x: string, sets: Map<string, string>): string => {
      if (sets.get(x) === x) return x;
      return findRoot(sets.get(x)!, sets);
    };
    
    // 同时构建数组和分组
    for (const [node, parent] of disjointSets.entries()) {
      const root = findRoot(node, disjointSets);
      
      // 添加到数组
      array.push({ node, parent, root });
      
      // 添加到分组
      if (!groupsMap.has(root)) {
        groupsMap.set(root, []);
      }
      groupsMap.get(root)!.push(node);
    }
    
    // 转换分组为数组格式
    const groups = Array.from(groupsMap.entries()).map(([root, members]) => ({
      root,
      members
    }));
    
    return { array, groups };
  }

  getSetColor(rootId: string): string {
    const colors = [
      '#e57373', '#f06292', '#ba68c8', '#9575cd', 
      '#7986cb', '#64b5f6', '#4fc3f7', '#4dd0e1', 
      '#4db6ac', '#81c784', '#aed581', '#dce775', 
      '#fff176', '#ffd54f', '#ffb74d', '#ff8a65'
    ];
    
    if (!this.animationController.currentStep || this.animationController.currentStep < 0) return colors[0];
    
    // 获取所有根节点
    const roots = this.getDisjointSetsData().groups.map(group => group.root);
    const rootIndex = roots.indexOf(rootId);
    
    // 返回对应颜色，如果索引超出范围则循环使用
    return colors[rootIndex % colors.length];
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
