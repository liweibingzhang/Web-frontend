export interface TreeNode {
  id: string;
  value: number;
  left?: TreeNode;
  right?: TreeNode;
  x?: number;
  y?: number;
}

export class BSTService {
  root: TreeNode | null = null;
  private nodeId = 0;

  constructor(data?: { nodes: any[]; edges: any[] }) {
    if (data) {
      this.root = this._rebuildFromGraph(data.nodes, data.edges);
      this.nodeId = data.nodes.length; // 避免 ID 冲突
    }
  }

  private _rebuildFromGraph(nodes: any[], edges: any[]): TreeNode | null {
    if (nodes.length === 0) return null;

    // 先创建所有节点的映射
    const nodeMap = new Map<string, TreeNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, {
        id: node.id,
        value: Number(node.label),
        x: node.x,
        y: node.y,
      });
    }

    // 建立子节点引用关系
    const childIds = new Set<string>();
    for (const edge of edges) {
      const parent = nodeMap.get(edge.source);
      const child = nodeMap.get(edge.target);
      if (parent && child) {
        if (child.value < parent.value) {
          parent.left = child;
        } else {
          parent.right = child;
        }
        childIds.add(child.id);
      }
    }

    // 找根节点（没有被作为 child 出现的节点）
    const rootNode = nodes.find(n => !childIds.has(n.id));
    return rootNode ? nodeMap.get(rootNode.id) ?? null : null;
  }


  insert(value: number): void {
    this.root = this._insert(this.root, value);
  }

  private _insert(node: TreeNode | null, value: number): TreeNode {
    if (!node) return { id: `${this.nodeId++}`, value };

    if (value < node.value) {
      node.left = this._insert(node.left ?? null, value);
    } else if (value > node.value) {
      node.right = this._insert(node.right ?? null, value);
    }
    return node;
  }

  // 返回搜索路径（用于高亮）
  searchPath(value: number): TreeNode[] {
    const path: TreeNode[] = [];
    let curr = this.root;
    while (curr) {
      path.push(curr);
      if (value === curr.value) break;
      curr = value < curr.value ? curr.left ?? null : curr.right ?? null;
    }
    return path;
  }

  toGraphData(): { nodes: any[]; edges: any[] } {
    const nodes: any[] = [];
    const edges: any[] = [];

    let xIndex = 0; // 中序编号，用于 x 坐标
    const horizontalSpacing = 80; // 每个节点之间的水平间距
    const verticalSpacing = 100; // 每层之间的垂直间距

    // 首先进行中序遍历并分配坐标
    const assignCoords = (node: TreeNode | null, depth: number): void => {
      if (!node) return;

      // 左子树
      assignCoords(node.left ?? null, depth + 1);

      // 当前节点
      node.x = xIndex * horizontalSpacing + 100; // 加 100 是为了居中
      node.y = depth * verticalSpacing + 100;
      xIndex++;

      // 右子树
      assignCoords(node.right ?? null, depth + 1);
    };

    // 然后进行 DFS 构建图结构（使用已有坐标）
    const buildGraph = (node: TreeNode | null) => {
      if (!node) return;

      nodes.push({ id: node.id, label: `${node.value}`, x: node.x, y: node.y });

      if (node.left) {
        edges.push({ source: node.id, target: node.left.id });
        buildGraph(node.left);
      }

      if (node.right) {
        edges.push({ source: node.id, target: node.right.id });
        buildGraph(node.right);
      }
    };

    assignCoords(this.root, 0);
    buildGraph(this.root);

    return { nodes, edges };
  }
}
