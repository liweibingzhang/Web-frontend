import { Instance } from '../../../../models/instance.model';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../../services/auth.service';
import { MyComponent } from '../../../../models/component.model';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonService } from '../../../../services/common.service';
import { User } from '../../../../models/user.model';
import { environment } from '../../../../app.config';
import { Group } from '../../../../models/group.model';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { materialModules } from '../../../../shared/material';
import { SaveInstanceDialogComponent } from '../save-instances-dialog/save-instances-dialog.component';
import { FormsModule } from '@angular/forms';
import { AiDialogComponent } from '../../../ai-dialog/ai-dialog.components';
import { MatSliderModule } from '@angular/material/slider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { InstanceManagerComponent } from '../instance-manager/instance-manager.component';
import { AnimationControllerComponent } from '../animation-controller/animation-controller.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon'; // 添加导入
import * as d3 from 'd3';
import { ChangeDetectorRef } from '@angular/core';

interface StepState {
  nodes: TreeNode[];
  metrics: {
    depth: number;
    multiply: number;
    add: number;
  };
}

// interface TreeNode extends d3.HierarchyNode {
//   x?: number;
//   y?: number;
//   data: {
//     x: string;
//     y: string;
//     operation: 'split' | 'multiply' | 'merge';
//     result?: string;
//     depth: number;
//     status: 'pending' | 'active' | 'complete';
//   };
// }

interface TreeNode {
  x: string;
  y: string;
  depth: number;
  // positionX: number;
  operation: 'split' | 'multiply' | 'merge';
  result?: string;
  step: number;
  parentId?: number;       // 新增父节点ID
  children: number[];      // 新增子节点索引
  positionX: number;
  level: number;           // 新增层级
  status: 'pending' | 'active' | 'complete'; // 新增状态
}

// 新增类型定义
type GuideContent = {
  title: string;
  description: string;
  formula?: string;
};


@Component({
  selector: 'app-structure-component-divideconquer-bigintegermulti',
  imports: [
    CommonModule, 
    FormsModule, 
    ...materialModules, 
    MatSliderModule, 
    MatExpansionModule, 
    MatTabsModule,
    // InstanceManagerComponent,
    AnimationControllerComponent,
    MatIconModule, // 显式添加 MatIconModule

  ],  
  templateUrl: './structure-component-divideconquer-bigintegermulti.component.html',
  styleUrl: './structure-component-divideconquer-bigintegermulti.component.css',
  standalone: true
})


export class DivideconquerBigintegermultiComponent {
  isLoggedIn: boolean = false;
  user: User | null = null;
  group: Group | null = null;
  component: MyComponent | null = null;
  instances: Instance[] = [];
  items: number[] = [];
  selectedInstance: Instance | null = null;
  selectedJsonconfig: string = '';

  num1 = '1234';
  num2 = '5678';
  // steps: StepState[] = [];
  // currentStep = -1;
  steps: TreeNode[] = [];
  visibleNodes: (TreeNode & { positionX: number })[] = [];
  
  // 可视化状态
  // visibleNodes: TreeNode[] = [];
  currentStep = 0;
  maxDepth = 0;
  currentDepth = 0;
  multiplyCount = 0;
  addCount = 0;

  // 在组件类中添加状态变量
  currentBuildStep = 0;
  nodeQueue: TreeNode[] = [];
  connectionLines: any[] = [];

   // 重置状态
  resetState = () => {
    this.steps = [];
    // this.currentStep = -1;
    this.currentStep = 0;
    this.visibleNodes = [];
    this.connectionLines = []; // 新增此行
    this.maxDepth = 0;
    this.multiplyCount = 0;
    this.addCount = 0;
    this.currentDepth = 0;
  };

  // 修改generateSteps方法
// generateSteps = (): void => {
//   this.resetState();
//   if (!this.num1 || !this.num2) return;

//   // 初始化根节点
//   const rootNode: TreeNode = {
//     x: this.num1,
//     y: this.num2,
//     depth: 0,
//     operation: 'split',
//     step: 0,
//     parentId: -1,
//     children: [],
//     positionX: 50,
//     level: 0,
//     status: 'pending'
//   };
  
//   this.nodeQueue = [rootNode];
//   this.steps = [];
//   this.startStepGeneration();
// };
  // 新增步骤生成方法
startStepGeneration() {
  const interval = setInterval(() => {
    if (this.currentBuildStep >= this.nodeQueue.length) {
      clearInterval(interval);
      return;
    }

    const currentNode = this.nodeQueue[this.currentBuildStep];
    
    // 更新节点状态
    currentNode.status = 'active';
    this.steps = [...this.nodeQueue.slice(0, this.currentBuildStep + 1)];
    
    // 处理子节点生成
    if (currentNode.operation === 'split' && currentNode.children.length === 0) {
      this.generateChildNodes(currentNode);
      this.generateConnectionLines(currentNode);
      this.connectionLines = [...this.connectionLines]; // 触发变更检测
    }

    // 更新可视化
    this.updateVisibleNodes();
    this.currentBuildStep++;
  }, 1000); // 调整时间间隔匹配动画速度
}
// 生成子节点
generateChildNodes(parent: TreeNode) {
  const [a, b] = this.splitNumber(parent.x, Math.floor(parent.x.length/2));
  const [c, d] = this.splitNumber(parent.y, Math.floor(parent.y.length/2));
  const childrenCount = parent.children.length; // 获取当前父节

  const children = [
    this.createChildNode(parent, a, c, 'split',childrenCount),// 左子节点
    this.createChildNode(parent, b, d, 'split',childrenCount+1),// 中子节点
    this.createChildNode(parent, 
      this.addStrings(a, b), 
      this.addStrings(c, d), 
      'split',childrenCount+2) // 右子节点
  ];
  
  parent.children = children.map(c => c.step);
  this.nodeQueue.push(...children);
}

// 创建子节点
// createChildNode(parent: TreeNode, x: string, y: string, op: 'split' | 'merge') {
//   return {
//     x,
//     y,
//     depth: parent.depth + 1,
//     operation: op,
//     step: this.nodeQueue.length,
//     parentId: parent.step,
//     children: [],
//     positionX: this.calculateChildPosition(parent, this.nodeQueue.length),
//     level: parent.level + 1,
//     status: 'pending'
//   };
// }
// 添加返回值类型和完整属性
createChildNode(
  parent: TreeNode, 
  x: string, 
  y: string, 
  op: 'split' | 'multiply' | 'merge',
  childIndex: number // 添加子节点索引参数
): TreeNode {
  return {
    x,
    y,
    depth: parent.depth + 1,
    operation: op,  // 确保operation类型匹配
    step: this.nodeQueue.length,
    parentId: parent.step,
    children: [],
    positionX: this.calculateChildPosition(parent, this.nodeQueue.length),
    level: parent.level + 1,
    status: 'pending' as 'pending', // 类型断言
    result: undefined  // 显式声明可选属性
  };
}

// 计算子节点位置
// calculateChildPosition(parent: TreeNode, childIndex: number) {
//   const basePos = parent.positionX;
//   const offset = 30 / (parent.level + 1);
//   // return basePos + (childIndex % 3 - 1) * offset;
//   return basePos + (childIndex - 1) * offset; // 调整偏移量
// }

// calculateChildPosition(parent: TreeNode, childIndex: number) {
//   const basePosition = parent.positionX;
//   const levelOffset = 40; // 每层基础偏移量
//   const spread = 5 * Math.pow(2, parent.level); // 层级越深间距越小

//   const childrenCount = parent.children.length;
//   const horizontalOffset = spread * (childIndex - childrenCount / 2); // 居中对齐

//   return basePosition + horizontalOffset;
// }
calculateChildPosition(parent: TreeNode, childIndex: number) {
  const basePosition = parent.positionX;
  const spread = 30 / (parent.depth + 1); // 动态调整层级间距
  return basePosition + (childIndex - 1) * spread * 2; // 增加横向分布范围
}



// 生成连接线
generateConnectionLines(parent: TreeNode) {
  const parentX = parent.positionX;
  const children = parent.children.map(c => this.nodeQueue[c]);

  if (children.length === 0) return;
  const startY = parent.depth * 120 + 80;

  // 水平连接线
  this.connectionLines.push({
    type: 'horizontal',
    x1: children[0].positionX,
    x2: children[2].positionX,
    // y: parent.level * 180 + 100
    y: parent.depth * 120 + 80 // 调整Y坐标匹配节点位置
  });

  // 垂直连接线
  children.forEach(child => {
    this.connectionLines.push({
      type: 'vertical',
      x: child.positionX,
      y1: parent.depth * 120 + 80,  // 父节点底部
      y2: child.depth * 120 + 30    // 子节点顶部
      // y1: parent.level * 180 + 80,
      // y2: child.level * 180 + 20
    });
  });

   this.cdr.detectChanges(); // 强制更新视图
    console.log('Generated lines:', this.connectionLines); // 调试输出
}
// 更新可见节点
updateVisibleNodes() {
  const levelFactor = 1 / (this.maxDepth + 1); // 根据最大深度动态调
  this.visibleNodes = this.steps.map(node => ({
    ...node,
    // positionX: node.positionX,
    depth: node.level,
    // positionX: node.positionX || 50,
    positionX: node.positionX,
    children: node.children || [],
    level: node.level || 0,
    status: node.status || 'pending',
    width:20
    // width: Math.max(80, 5 * Math.pow(2, this.maxDepth - node.level)*levelFactor)
  }));
}

// 修改后的树节点布局方法
private layoutTree(node: TreeNode): void {
  // 设置基础布局参数
  const NODE_WIDTH = 180;
  const LEVEL_HEIGHT = 120;
  const SIBLING_SPACING = 40;
  const TREE_SPACING = 80;

  // 后序遍历计算节点位置
  const postOrderLayout = (node: TreeNode, depth: number, pos: { x: number }) => {
    if (!node) return;
    
    // 递归处理子节点
    node.children.forEach(childId => {
      const child = this.steps.find(n => n.step === childId);
      if (child) postOrderLayout(child, depth + 1, pos);
    });

    // 计算当前节点位置
    const children = node.children
      .map(childId => this.steps.find(n => n.step === childId))
      .filter(n => n) as TreeNode[];
    
    if (children.length === 0) {
      // 叶子节点直接使用当前位置
      node.positionX = pos.x;
      pos.x += NODE_WIDTH + SIBLING_SPACING;
    } else {
      // 父节点位于子节点中间
      const firstChild = children[0];
      const lastChild = children[children.length - 1];
      node.positionX = (firstChild.positionX + lastChild.positionX) / 2;
    }

    // 设置垂直位置
    node.level = depth;
    node.depth = depth;
  };

  // 计算子树宽度
  const getTreeWidth = (node: TreeNode): number => {
    if (!node) return 0;
    if (node.children.length === 0) return NODE_WIDTH;
    return node.children
      .map(childId => getTreeWidth(this.steps.find(n => n.step === childId)!))
      .reduce((sum, width) => sum + width + SIBLING_SPACING, -SIBLING_SPACING);
  };

  // 执行布局计算
  const root = node;
  const treeWidth = getTreeWidth(root);
  const startPos = { x: (window.innerWidth - treeWidth) / 2 }; // 居中布局
  postOrderLayout(root, 0, startPos);
}

// // 更新generateSteps方法
// generateSteps = (): void => {
//   this.resetState();
//   if (!this.num1 || !this.num2) return;

//   // 生成完整树结构
//   this.divideAndConquer(this.num1, this.num2, 0);

//   // 执行布局计算
//   if (this.steps.length > 0) {
//     const root = this.steps[0];
//     this.layoutTree(root);
//     this.updateVisibleNodes();
//   }

//   // 更新统计信息
//   this.maxDepth = Math.max(...this.steps.map(s => s.depth));
//   this.multiplyCount = this.steps.filter(s => s.operation === 'multiply').length;
//   this.addCount = this.steps.filter(s => s.operation === 'merge').length;
// };


  generateSteps = (): void => {
    this.resetState();
    if (!this.num1 || !this.num2) return;

    // 执行分治递归
    this.divideAndConquer(this.num1, this.num2, 0);
    

    // 按深度层级组织节点
    const depthMap = new Map<number, TreeNode[]>();
    this.steps.forEach(node => {
      const depth = node.depth;
      if (!depthMap.has(depth)) depthMap.set(depth, []);
      depthMap.get(depth)!.push(node);
    });

    // 计算节点水平位置（树状布局）
    const nodePositions = new Map<TreeNode, number>();
    let currentX = 0;
    
    // 从最深层开始反向计算位置
    for (let depth = this.maxDepth; depth >= 0; depth--) {
      const nodes = depthMap.get(depth) || [];
      const levelWidth = nodes.length * 200; // 每个节点基础宽度
      // const startX = (currentX - levelWidth/2) + 50;
      const startX = (currentX - levelWidth/2);
      
      nodes.forEach((node, index) => {
        const x = startX + index * (levelWidth / nodes.length);
        nodePositions.set(node, x);
      });
      
      currentX = startX + levelWidth/2;
    }

    // 生成可见节点数据
    this.visibleNodes = this.steps.map(node => ({
      ...node,
      positionX: nodePositions.get(node) || 50
    }));

    // 计算每个节点的水平位置
    this.visibleNodes = this.steps.map(node => {
      const siblings = depthMap.get(node.depth) || [];
      const index = siblings.indexOf(node);
      const levelWidth = 100 / (Math.pow(2, node.depth) + 1);
      return {
        ...node,
        positionX: 50 + (index - siblings.length/2) * (100 / (siblings.length + 1)),
        depthOffset: node.depth * 120
      };
      // const total = siblings.length;
      // const positionX = (index + 0.5) * (100 / total); // 水平居中分布
      // return { ...node, positionX };
    });

    // 更新统计信息
    this.maxDepth = Math.max(...this.steps.map(s => s.depth));
    this.multiplyCount = this.steps.filter(s => s.operation === 'multiply').length;
    this.addCount = this.steps.filter(s => s.operation === 'merge').length;
    
     // 调用连线生成方法
    this.steps.forEach(node => {
        if (node.operation === 'split' && node.children.length > 0) {
            this.generateConnectionLines(node);
            this.cdr.detectChanges(); // 强制更新视图
        }
    });
  
  };

  currentStepDescription: string = '';

  private getStepDescription(node: TreeNode): string {
    if (!node) return '';
    switch(node.operation) {
      case 'split':
        return `将 ${node.x} 和 ${node.y} 分割为高位和低位，进行递归分解`;
      case 'multiply':
        return `直接计算 ${node.x} × ${node.y} = ${node.result}`;
      case 'merge':
        return `合并子结果：${node.result}`;
      default:
        return '当前步骤';
    }
  }

  

   // 生成步骤并构建可视化节点
  // generateSteps = (): void => {
  //   this.resetState();

  //   if (!this.num1 || !this.num2) return;

  //   // 执行分治递归
  //   this.divideAndConquer(this.num1, this.num2, 0);

  //   // 可视化节点生成
  //   this.visibleNodes = this.steps.map((step, i) => ({
  //     ...step,
  //     positionX: (i + 1) * 10, // 可根据需要改为更复杂布局算法
  //   }));

  //   // 统计信息
  //   this.maxDepth = Math.max(...this.steps.map(s => s.depth));
  //   this.multiplyCount = this.steps.filter(s => s.operation === 'multiply').length;
  //   this.addCount = this.steps.filter(s => s.operation === 'merge').length;
  // };

  // 修复方法名拼写错误
  // private organizeSteps(nodes: TreeNode[]) { // 修正organiznizeSteps为organizeSteps
  //   let currentDepth = 0;
  //   let multiplyCount = 0;
  //   let addCount = 0;
  //   const accumulatedNodes: TreeNode[] = []; // 用于累积所有节点

  //   this.steps = nodes.map(node => {
  //     accumulatedNodes.push(node); // 逐步累积节点
  //     currentDepth = Math.max(currentDepth, node.depth);
  //     if (node.operation === 'multiply') multiplyCount++;
  //     if (node.operation === 'merge') addCount += 3;

  //     return {
  //       nodes: [...accumulatedNodes], // 每一步包含当前所有累积的节点
  //       // nodes: [node],
  //       metrics: {
  //         depth: currentDepth,
  //         multiply: multiplyCount,
  //         add: addCount
  //       }
  //     };
  //   });

  //   this.maxDepth = currentDepth;
  // }

  

  //  private karatsubaSteps(
  //   x: string,
  //   y: string,
  //   depth: number = 0,
  //   positionX: number = 50
  // ): TreeNode[] {
  //   const nodes: TreeNode[] = [];
  //   const n = Math.max(x.length, y.length);
  //   const step = ++this.currentStep;

  //   // 基础情况
  //   if (n <= 2) {
  //     const result = (BigInt(x) * BigInt(y)).toString();
  //     this.multiplyCount++;
  //     nodes.push({
  //       x,
  //       y,
  //       depth,
  //       positionX,
  //       operation: 'multiply',
  //       result,
  //       step
  //     });
  //     return nodes;
  //   }

  //   // 分割步骤
  //   nodes.push({
  //     x,
  //     y,
  //     depth,
  //     positionX,
  //     operation: 'split',
  //     step
  //   });

  //   // 递归分解
  //   const m = Math.floor(n / 2);
  //   const [a, b] = this.splitNumber(x, m);
  //   const [c, d] = this.splitNumber(y, m);

  //   // 递归分解时调整位置参数
  //   const acNodes = this.karatsubaSteps(a, c, depth + 1, positionX - (50 / (depth + 1)));
  //   const bdNodes = this.karatsubaSteps(b, d, depth + 1, positionX + (50 / (depth + 1)));
  //   // const acNodes = this.karatsubaSteps(a, c, depth + 1, positionX - 25);
  //   // const bdNodes = this.karatsubaSteps(b, d, depth + 1, positionX + 25);
  //   const abcdNodes = this.karatsubaSteps(
  //     (BigInt(a) + BigInt(b)).toString(),
  //     (BigInt(c) + BigInt(d)).toString(),
  //     depth + 1,
  //     positionX
  //   );

  //   // 合并步骤
  //   const mergeResult = this.calculateMergeResult(acNodes, bdNodes, abcdNodes, m);
  //   nodes.push({
  //     x: x.padStart(n, '0'),
  //     y: y.padStart(n, '0'),
  //     depth,
  //     positionX,
  //     operation: 'merge',
  //     result: mergeResult,
  //     step: ++this.currentStep
  //   });

  //   return [...nodes, ...acNodes, ...bdNodes, ...abcdNodes];
  // }

  // 计算合并结果
  private calculateMergeResult(
    acSteps: TreeNode[],
    bdSteps: TreeNode[],
    abcdSteps: TreeNode[],
    m: number
  ): string {
    try {
      const ac = BigInt(acSteps.find(n => n.operation === 'multiply')?.result || '0');
      const bd = BigInt(bdSteps.find(n => n.operation === 'multiply')?.result || '0');
      const ab_cd = BigInt(abcdSteps.find(n => n.operation === 'multiply')?.result || '0');

      const ad_plus_bc = ab_cd - ac - bd;
      this.addCount += 2; // 两次减法

      const n = m * 2;
      const part1 = ac * BigInt(10 ** n);
      const part2 = ad_plus_bc * BigInt(10 ** m);
      
      this.addCount += 2; // 最终合并的两次加法
      return (part1 + part2 + bd).toString();
    } catch (e) {
      console.error('Merge calculation error:', e);
      return '0';
    }
  }

  // 辅助方法：数字分割
  private splitNumber(num: string, position: number): [string, string] {
    const padded = num.padStart(position * 2, '0');
    return [padded.slice(0, position), padded.slice(position)];
  }

  // 组织步骤用于动画
  private organiznizeSteps(nodes: TreeNode[]) {
    let currentDepth = 0;
    let multiplyCount = 0;
    let addCount = 0;

    for (const node of this.steps) {
      this.maxDepth = Math.max(this.maxDepth, node.depth);
      if (node.operation === 'multiply') this.multiplyCount++;
      if (node.operation === 'merge') this.addCount += 3;
    }

    // this.steps = nodes.map(node => {
    //   currentDepth = Math.max(currentDepth, node.depth);
    //   if (node.operation === 'multiply') multiplyCount++;
    //   if (node.operation === 'merge') addCount += 3;

    //   return {
    //     nodes: [node],
    //     metrics: {
    //       depth: currentDepth,
    //       multiply: multiplyCount,
    //       add: addCount
    //     }
    //   };
    // });

    this.maxDepth = currentDepth;
  }

  // // 更新状态
  // updateState = (step: StepState) => {
  //   this.visibleNodes = step.nodes;
  //   this.currentDepth = step.metrics.depth;
  //   this.multiplyCount = step.metrics.multiply;
  //   this.addCount = step.metrics.add;
  // };

  // 在updateState中添加容错处理
// updateState = (step: StepState) => {
//   this.visibleNodes = step?.nodes || [];
//   this.currentDepth = step?.metrics.depth || 0;
//   this.multiplyCount = step?.metrics.multiply || 0;
//   this.addCount = step?.metrics.add || 0;
  
//   // 强制触发变更检测
//   setTimeout(() => {
//     this.visibleNodes = [...this.visibleNodes];
//   });
// };

  // 在组件类中添加
  currentGuide: string = '';
  guideMap: Map<string, GuideContent> = new Map([
    ['split', {
      title: '分割阶段',
      description: '将大数拆分为高位和低位部分，为递归计算做准备',
      formula: 'X = A·10ⁿ + B\nY = C·10ⁿ + D'
    }],
    ['multiply', {
      title: '直接计算',
      description: '当数字足够小时直接进行乘法运算',
      formula: 'Result = X × Y'
    }],
    ['merge', {
      title: '合并结果',
      description: '组合子问题的解得到最终结果',
      formula: 'AC·10²ⁿ + [(A+B)(C+D)-AC-BD]·10ⁿ + BD'
    }]
  ]);

  // 在 DivideconquerBigintegermultiComponent 类中添加
  // 新增操作标签转换方法
  getOperationLabel(operation: string): string {
    switch(operation) {
      case 'split': return '分割';
      case 'multiply': return '乘法'; 
      case 'merge': return '合并';
      default: return operation;
    }
  }

    // 控制动画步进
  updateState = (index: number): void => {
    this.currentStep = index;
    this.currentStepDescription = this.getStepDescription(this.steps[index]);
    this.currentDepth = this.steps[index]?.depth || 0;
    const node = this.steps[index];
    const guide = this.guideMap.get(node.operation);
    
    this.currentGuide = guide ? `
      <h4>${guide.title}</h4>
      <p>${guide.description}</p>
      ${guide.formula ? `<pre>${guide.formula}</pre>` : ''}
    ` : '';
  
  };



  // private karatsubaSteps(x: string, y: string, depth = 0, position = 50): TreeNode[] {
  //   const steps: TreeNode[] = [];
  //   const n = Math.max(x.length, y.length);
  //   // const step = ++this.currentStep;
    
  //   // 基础步骤
  //   if (n <= 2) {
  //     const node = {
  //       x, y, depth,
  //       positionX: position,
  //       operation: 'multiply',
  //       result: (BigInt(x)*BigInt(y)).toString(),
  //       step: this.currentStep++
  //     };
  //     steps.push(node);
  //     return steps;
  //   }

  //   // 分割步骤
  //   const splitNode = {
  //     x, y, depth,
  //     positionX: position,
  //     operation: 'split',
  //     step: this.currentStep++
  //   };
  //   steps.push(splitNode);

  //   // 递归步骤
  //   const m = Math.floor(n/2);
  //   const [a, b] = [x.slice(0,m), x.slice(m)];
  //   const [c, d] = [y.slice(0,m), y.slice(m)];
    
  //   const acSteps = this.karatsubaSteps(a, c, depth+1, position - 25);
  //   const bdSteps = this.karatsubaSteps(b, d, depth+1, position + 25);
  //   const abcdSteps = this.karatsubaSteps(
  //     (BigInt(a)+BigInt(b)).toString(),
  //     (BigInt(c)+BigInt(d)).toString(),
  //     depth+1,
  //     position
  //   );

  //   // 合并步骤
  //   const mergeNode = {
  //     x: x.padStart(n,'0'),
  //     y: y.padStart(n,'0'),
  //     depth,
  //     positionX: position,
  //     operation: 'merge',
  //     step: this.currentStep++,
  //     result: this.calculateMergeResult(acSteps, bdSteps, abcdSteps, m)
  //   };
  //   steps.push(mergeNode);

  //   return [...steps, ...acSteps, ...bdSteps, ...abcdSteps];
  // }

  // updateState = (step: StepState) => {
  //   this.visibleNodes = step.nodes;
  //   this.currentDepth = step.metrics.depth;
  //   this.multiplyCount = step.metrics.multiply;
  //   this.addCount = step.metrics.add;
  // };

  divideAndConquer(x: string, y: string, depth: number, parentStep: number = -1): string {
  x = this.padToPowerOfTwo(x);
  y = this.padToPowerOfTwo(y);

  const stepIndex = this.steps.length;

  // 基础情况
  if (x.length <= 2) {
    const result = (parseInt(x) * parseInt(y)).toString();
    this.steps.push(this.createNode({
      x,
      y,
      operation: 'multiply',
      depth,
      result,
      step: stepIndex,
      parentId: parentStep,
      status: 'complete',
      positionX: this.calculateNodePosition(depth, stepIndex),
      level: depth
    }));
    return result;
  }

  const n = x.length;
  const m = Math.floor(n / 2);
  const a = x.substring(0, n - m);
  const b = x.substring(n - m);
  const c = y.substring(0, n - m);
  const d = y.substring(n - m);

  // 分割步骤
  const splitNode = this.createNode({
    x,
    y,
    operation: 'split',
    depth,
    step: stepIndex,
    parentId: parentStep,
    positionX: this.calculateNodePosition(depth, stepIndex),
    level: depth,
    status: 'pending' // 添加缺失的status属性
  });
  this.steps.push(splitNode);

  // 递归分解（记录子节点索引）
  const ac = this.divideAndConquer(a, c, depth + 1, splitNode.step);
  const bd = this.divideAndConquer(b, d, depth + 1, splitNode.step);
  const ab = this.addStrings(a, b);
  const cd = this.addStrings(c, d);
  const abcd = this.divideAndConquer(ab, cd, depth + 1, splitNode.step);

  // 更新父节点的children
  const childrenSteps = [
    stepIndex + 1, // ac节点位置
    stepIndex + 2, // bd节点位置
    stepIndex + 3  // abcd节点位置
  ];
  splitNode.children = childrenSteps;

  // 合并步骤
  const middle = this.subtractStrings(this.subtractStrings(abcd, ac), bd);
  const acShift = ac + '0'.repeat(2 * m);
  const midShift = middle + '0'.repeat(m);
  const result = this.addStrings(this.addStrings(acShift, midShift), bd);

  this.steps.push(this.createNode({
    x,
    y,
    operation: 'merge',
    depth,
    result,
    step: this.steps.length,
    parentId: parentStep,
    status: 'complete',
    positionX: this.calculateNodePosition(depth, this.steps.length),
    level: depth
  }));

  return result;
}

// 新增辅助方法
private createNode(params: {
  x: string;
  y: string;
  operation: 'split' | 'multiply' | 'merge';
  depth: number;
  step: number;
  parentId: number;
  positionX: number;
  level: number;
  status: 'pending' | 'active' | 'complete';
  result?: string;
}): TreeNode {
  return {
    ...params,
    children: params.operation === 'split' ? [] : [],
    result: params.result
  };
}

// private calculateNodePosition(depth: number, step: number): number {
//   // 简单的位置计算逻辑，可根据需要优化
//   const basePosition = 50;
//   const levelOffset = 10 * depth;
//   return basePosition + (step % 3 - 1) * levelOffset;
// }

private calculateNodePosition(depth: number, step: number): number {
  const basePosition = 50; // 中心位置
  const levelWidth = 80; // 每个层级的总宽度
  const horizontalSpacing = 40; // 同层级节点的水平间距
  const nodesPerLevel = Math.pow(2, depth); // 当前层级的节点数
  const levelFactor = 1 / (depth + 1); // 根据层级动态调整的因子
  // 根据步骤在层级中的位置计算偏移量
  const positionInLevel = step % nodesPerLevel;
  const offset = (positionInLevel - (nodesPerLevel - 1) / 2) * horizontalSpacing* levelFactor;

  return basePosition + offset;
}

  // 主递归函数
  // divideAndConquer(x: string, y: string, depth: number): string {
  //   x = this.padToPowerOfTwo(x);
  //   y = this.padToPowerOfTwo(y);

  //   const stepIndex = this.steps.length;

  //   // 基础情况
  //   if (x.length <= 2) {
  //     const result = (parseInt(x) * parseInt(y)).toString();
  //     this.steps.push({ x, y, result, operation: 'multiply', depth, step: stepIndex });
  //     return result;
  //   }

  //   const n = x.length;
  //   const m = Math.floor(n / 2);
  //   const a = x.substring(0, n - m);
  //   const b = x.substring(n - m);
  //   const c = y.substring(0, n - m);
  //   const d = y.substring(n - m);

  //   // 分解步骤
  //   this.steps.push({ x, y, operation: 'split', depth, step: stepIndex });

  //   const ac = this.divideAndConquer(a, c, depth + 1);
  //   const bd = this.divideAndConquer(b, d, depth + 1);
  //   const ab = this.addStrings(a, b);
  //   const cd = this.addStrings(c, d);
  //   const abcd = this.divideAndConquer(ab, cd, depth + 1);

  //   const middle = this.subtractStrings(this.subtractStrings(abcd, ac), bd);

  //   const acShift = ac + '0'.repeat(2 * m);
  //   const midShift = middle + '0'.repeat(m);
  //   const result = this.addStrings(this.addStrings(acShift, midShift), bd);

  //   this.steps.push({ x, y, result, operation: 'merge', depth, step: this.steps.length });

  //   return result;
  // }

   // 辅助函数：补0使两字符串长度为2的幂
  padToPowerOfTwo(num: string): string {
    let len = num.length;
    let power = 1;
    while (power < len) power *= 2;
    return num.padStart(power, '0');
  }

  // 辅助函数：字符串加法
  addStrings(a: string, b: string): string {
    let res = '';
    let carry = 0;
    a = a.padStart(b.length, '0');
    b = b.padStart(a.length, '0');

    for (let i = a.length - 1; i >= 0; i--) {
      const sum = parseInt(a[i]) + parseInt(b[i]) + carry;
      res = (sum % 10) + res;
      carry = Math.floor(sum / 10);
    }

    if (carry > 0) res = carry + res;
    return res.replace(/^0+/, '') || '0';
  }

  // 辅助函数：字符串减法（假设 a ≥ b）
  subtractStrings(a: string, b: string): string {
    let res = '';
    let borrow = 0;
    a = a.padStart(b.length, '0');
    b = b.padStart(a.length, '0');

    for (let i = a.length - 1; i >= 0; i--) {
      let diff = parseInt(a[i]) - parseInt(b[i]) - borrow;
      if (diff < 0) {
        diff += 10;
        borrow = 1;
      } else {
        borrow = 0;
      }
      res = diff + res;
    }

    return res.replace(/^0+/, '') || '0';
  }


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

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService, private commonService: CommonService, private dialog: MatDialog,private cdr: ChangeDetectorRef) { }

  updateInstances(){
    const componentId = this.route.snapshot.paramMap.get("componentId");
    this.commonService.selectInstanceByComponentId(Number(componentId)).subscribe({
      next: (data: any) => {
        console.log(data);
        this.instances = data;
        this.instances.unshift({'name': 'default-instance', 'config': '[1, 2, 3, 4, 5]'})
        this.selectedInstance = this.instances[0];
        this.items = JSON.parse(this.instances[0]['config']);
        this.selectedJsonconfig = this.instances[0]['config'];
      },
      error: (err: any) =>{
        console.log(err.error);
      }
    });
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

    const json = JSON.stringify(dataToExport, null, 2); // 格式化
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedInstance!['name']}.json`;
    a.click();

    URL.revokeObjectURL(url); // 清理资源
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
      this.items = JSON.parse(this.selectedJsonconfig);
    } catch (e) {
      console.error('无效的 JSON 格式:', e);
    }
  }

  onInstanceChange(event: any){
    this.items = JSON.parse(this.selectedInstance!['config']);
    this.selectedJsonconfig = this.selectedInstance!['config'];
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
}

