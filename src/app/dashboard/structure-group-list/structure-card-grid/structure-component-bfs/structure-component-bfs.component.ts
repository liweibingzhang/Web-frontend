import { Component, AfterViewInit, OnInit, ViewChild } from '@angular/core';
import { Graph } from '@antv/g6';
import { BSTService } from '../structure-component-bst/structure-component-bst.service';
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
  selector: 'app-structure-component-bfs',
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
  templateUrl: './structure-component-bfs.component.html',
  styleUrl: './structure-component-bfs.component.css'
})
export class BfsComponent implements AfterViewInit, OnInit {
  @ViewChild(InstanceManagerComponent) instanceManager!: InstanceManagerComponent;
  @ViewChild(AnimationControllerComponent) animationController!: AnimationControllerComponent;
  
  graph!: Graph;
  bst: BSTService = new BSTService();

  isLoggedIn: boolean = false;
  user: any;
  group: any;
  component: MyComponent | null = null;

  searchValue: number = 0; // 搜索值

  animationSteps: Array<{
    visitedNodes: string[]; // 已访问的节点
    currentLevel: string[]; // 当前正在访问的层级节点
    queue: string[]; // 队列
    found: boolean; // 是否找到目标值
    targetNode: string | null; // 目标节点
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
    this.generateBFSSteps = this.generateBFSSteps.bind(this);
    this.resetAnimationSteps = this.resetAnimationSteps.bind(this);
    this.updateAnimationSteps = this.updateAnimationSteps.bind(this);
  }

  ngAfterViewInit() {
    this.initGraph();
    // 设置默认配置
    const defaultConfig = {
      "nodes": [
        { "id": "0", "label": "1", "x": 300, "y": 100 },
        { "id": "1", "label": "2", "x": 200, "y": 200 },
        { "id": "2", "label": "3", "x": 400, "y": 200 },
        { "id": "3", "label": "4", "x": 150, "y": 300 },
        { "id": "4", "label": "5", "x": 250, "y": 300 },
        { "id": "5", "label": "6", "x": 350, "y": 300 },
        { "id": "6", "label": "7", "x": 450, "y": 300 }
      ],
      "edges": [
        { "source": "0", "target": "1" },
        { "source": "0", "target": "2" },
        { "source": "1", "target": "3" },
        { "source": "1", "target": "4" },
        { "source": "2", "target": "5" },
        { "source": "2", "target": "6" }
      ]
    };
    // 更新实例
    this.instanceManager.updateInstances(defaultConfig);
  }

  private initGraph() {
    this.graph = new Graph({
      container: 'bfs-container',
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
      },
      layout: {
        type: "antv-dagre",
        direction: "TB"
      }
    });
  }

  onConfigUpdated(event: { instance: Instance | null, config: string }) {
    try {
      const graphData = JSON.parse(event.config);
      this.bst = new BSTService(graphData);
      this.graph.setData(graphData);
      this.renderGraph(); // 渲染图形
      this.generateBFSSteps();
    } catch (e) {
      console.error('无效的图形配置格式:', e);
    }
  }

  generateBFSSteps = () => {
    const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
    const target = this.searchValue;
    
    // 构建邻接表
    const adjacencyList = new Map<string, string[]>();
    graphData.nodes.forEach((node: any) => {
      adjacencyList.set(node.id, []);
    });
    graphData.edges.forEach((edge: any) => {
      adjacencyList.get(edge.source)?.push(edge.target);
    });

    const visited = new Set<string>();
    const queue: string[] = ['0'];  // 从根节点开始
    visited.add('0');  // 将根节点标记为已访问
    
    // 清空之前的步骤
    this.animationSteps = [];

    // 记录初始状态
    this.animationSteps.push({
      visitedNodes: Array.from(visited),
      currentLevel: ['0'],
      queue: [...queue],
      found: false,
      targetNode: null
    });

    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      const nodeValue = graphData.nodes.find((n: any) => n.id === currentNode)?.label;
      
      // 检查是否找到目标值
      if (nodeValue === target.toString()) {
        this.animationSteps.push({
          visitedNodes: Array.from(visited),
          currentLevel: [currentNode],
          queue: [],  // 清空队列
          found: true,
          targetNode: currentNode
        });
        break;  // 找到目标值后立即退出循环
      }

      // 获取当前节点的所有未访问邻居
      const neighbors = adjacencyList.get(currentNode) || [];
      
      // 为每个邻居节点创建单独的步骤
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          
          // 为每个新访问的节点创建一个步骤
          this.animationSteps.push({
            visitedNodes: Array.from(visited),
            currentLevel: [neighbor],
            queue: [...queue],
            found: false,
            targetNode: null
          });

          // 检查新加入的节点是否为目标值
          const neighborValue = graphData.nodes.find((n: any) => n.id === neighbor)?.label;
          if (neighborValue === target.toString()) {
            this.animationSteps.push({
              visitedNodes: Array.from(visited),
              currentLevel: [neighbor],
              queue: [],  // 清空队列
              found: true,
              targetNode: neighbor
            });
            queue.length = 0;  // 清空队列以结束while循环
            break;
          }
        }
      }
    }

    // 如果没有找到目标值，添加最终步骤
    if (!this.animationSteps[this.animationSteps.length - 1].found) {
      this.animationSteps.push({
        visitedNodes: Array.from(visited),
        currentLevel: [],
        queue: [],
        found: false,
        targetNode: null
      });
    }
  }

  resetAnimationSteps = () => {
    this.animationSteps = [];
    const graphData = JSON.parse(this.instanceManager.selectedJsonconfig);
    this.graph.setData(graphData);
    this.renderGraph([], [], null); // 重置所有节点的样式
    this.generateBFSSteps();
  }

  updateAnimationSteps = (step: any) => {
    this.renderGraph(step.visitedNodes, step.currentLevel, step.targetNode); // 更新图形
  }

  // 根据传入的访问节点和当前层级节点，更新图形的节点样式并渲染图形。
  renderGraph(visitedNodes: string[] = [], currentLevel: string[] = [], targetNode: string | null = null) {
    const { nodes, edges } = JSON.parse(this.instanceManager.selectedJsonconfig);
    nodes.forEach((node: any) => {
      node.style = {
        fill: targetNode === node.id
          ? '#ff0000'  // 目标节点为红色
          : currentLevel.includes(node.id)
            ? '#ffa500'  // 当前访问的节点为橙色
            : visitedNodes.includes(node.id)
              ? '#2ecc71' // 已访问的节点为绿色
              : '#1890ff', // 未访问的节点为蓝色
        lineWidth: currentLevel.includes(node.id) ? 3 : 1,
        stroke: currentLevel.includes(node.id) ? '#ff8c00' : '#fff',
        size: currentLevel.includes(node.id) ? 15 : 10
      };
    });

    // 高亮当前正在遍历的边
    edges.forEach((edge: any) => {
      edge.style = {
        stroke: currentLevel.includes(edge.target) ? '#ffa500' : '#666',
        lineWidth: currentLevel.includes(edge.target) ? 2 : 1
      };
    });

    this.graph.setData({ nodes, edges });
    this.graph.render();
  }

  getBFSDescription(): { algorithm: string, visualization: string } {
    return {
      algorithm: `广度优先搜索(BFS)的时间复杂度为 O(V + E)
具体步骤：
1. 从根节点开始，将其加入队列
2. 取出队首节点，访问该节点 
3. 将该节点的所有未访问的邻接节点加入队列
4. 重复步骤2-3，直到队列为空`,
      visualization: `
可视化元素说明：
- 蓝色节点：未访问节点
- 绿色节点：已访问节点
- 红色节点：目标节点`
    }
  }

  onGenerateRandom() {
    // 生成4-7个节点的随机二叉树
    const nodeCount = Math.floor(Math.random() * 4) + 4;
    const nodes = [];
    const edges = [];
    
    // 布局配置
    const horizontalSpacing = 100; // 水平间距基准值
    const verticalSpacing = 80;    // 垂直间距
    const startY = 100;            // 起始Y坐标
    const centerX = 400;           // 中心X坐标
    
    // 计算树的最大深度
    const maxDepth = Math.floor(Math.log2(nodeCount)) + 1;
    
    // 生成节点并设置合适的坐标
    for (let i = 0; i < nodeCount; i++) {
      const value = Math.floor(Math.random() * 100) + 1; // 1-100的随机数
      
      // 计算节点所在层级
      const level = Math.floor(Math.log2(i + 1));
      
      // 计算当前层的节点总数和当前节点在层中的位置
      const nodesInLevel = Math.min(Math.pow(2, level), nodeCount - Math.pow(2, level) + 1);
      const positionInLevel = i - (Math.pow(2, level) - 1);
      
      // 计算当前层的总宽度
      const levelWidth = (nodesInLevel - 1) * horizontalSpacing;
      
      // 计算x坐标：确保居中对齐
      const startX = centerX - (levelWidth / 2);
      const x = startX + (positionInLevel * horizontalSpacing);
      
      // 计算y坐标
      const y = startY + (level * verticalSpacing);
      
      nodes.push({
        id: i.toString(),
        label: value.toString(),
        x: x,
        y: y
      });
    }

    // 生成边 (确保是合法的二叉树结构)
    for (let i = 0; i < nodeCount; i++) {
      const leftChild = 2 * i + 1;
      const rightChild = 2 * i + 2;
      
      if (leftChild < nodeCount) {
        edges.push({
          source: i.toString(),
          target: leftChild.toString()
        });
      }
      
      if (rightChild < nodeCount) {
        edges.push({
          source: i.toString(),
          target: rightChild.toString()
        });
      }
    }

    const newConfig = {
      nodes: nodes,
      edges: edges
    };

    // 更新实例管理器的配置
    this.instanceManager.selectedJsonconfig = JSON.stringify(newConfig, null, 2);
    this.onConfigUpdated({
      instance: null,
      config: JSON.stringify(newConfig)
    });
  }
}
