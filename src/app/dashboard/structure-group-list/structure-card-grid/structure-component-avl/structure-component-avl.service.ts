export interface AvlTreeNode {
  id: string;
  value: number;
  left?: AvlTreeNode;
  right?: AvlTreeNode;
  x?: number;
  y?: number;
  height: number; // Added height property for AVL
}

export class AvlTreeService { // Renamed class
  root: AvlTreeNode | null = null;
  private nodeId = 0;

  constructor(data?: { nodes: any[]; edges: any[] }) {
    if (data) {
      this.root = this._rebuildFromGraph(data.nodes, data.edges);
      this.nodeId = data.nodes.length; // Avoid ID conflicts
      this._updateHeights(this.root); // Update heights after rebuilding
    }
  }

  private _rebuildFromGraph(nodes: any[], edges: any[]): AvlTreeNode | null { // Updated type
    if (nodes.length === 0) return null;

    // First create a map of all nodes
    const nodeMap = new Map<string, AvlTreeNode>(); // Updated type
    for (const node of nodes) {
      nodeMap.set(node.id, {
        id: node.id,
        value: Number(node.label),
        x: node.x,
        y: node.y,
        height: 1, // Initialize height, will update later
      });
    }

    // Establish child node relationships
    const childIds = new Set<string>();
    for (const edge of edges) {
      const parent = nodeMap.get(edge.source);
      const child = nodeMap.get(edge.target);
      if (parent && child) {
        // Assuming graph data maintains BST property for simplicity in rebuilding
        if (child.value < parent.value) {
          parent.left = child;
        } else {
          parent.right = child;
        }
        childIds.add(child.id);
      }
    }

    // Find the root node (node that is not a child)
    const rootNode = nodes.find(n => !childIds.has(n.id));
    return rootNode ? nodeMap.get(rootNode.id) ?? null : null;
  }

  private _getHeight(node: AvlTreeNode | null): number { // Updated type
    return node ? node.height : 0;
  }

  private _getBalanceFactor(node: AvlTreeNode | null): number { // Updated type
    return node ? this._getHeight(node.left ?? null) - this._getHeight(node.right ?? null) : 0;
  }

  private _updateHeight(node: AvlTreeNode): void { // Updated type
    node.height = Math.max(this._getHeight(node.left ?? null), this._getHeight(node.right ?? null)) + 1;
  }

  private _updateHeights(node: AvlTreeNode | null): void { // Helper to update all heights after rebuild
    if (!node) return;
    this._updateHeights(node.left ?? null);
    this._updateHeights(node.right ?? null);
    this._updateHeight(node);
  }


  private _rightRotate(y: AvlTreeNode): AvlTreeNode { // Updated type
    const x = y.left!;
    const T2 = x.right;

    // Perform rotation
    x.right = y;
    y.left = T2;

    // Update heights
    this._updateHeight(y);
    this._updateHeight(x);

    // Return new root
    return x;
  }

  private _leftRotate(x: AvlTreeNode): AvlTreeNode { // Updated type
    const y = x.right!;
    const T2 = y.left;

    // Perform rotation
    y.left = x;
    x.right = T2;

    // Update heights
    this._updateHeight(x);
    this._updateHeight(y);

    // Return new root
    return y;
  }

  insert(value: number): void {
    this.root = this._insert(this.root, value);
  }

  private _insert(node: AvlTreeNode | null, value: number): AvlTreeNode { // Updated type
    // 1. Perform the normal BST insertion
    if (!node) return { id: `${this.nodeId++}`, value, height: 1 };

    if (value < node.value) {
      node.left = this._insert(node.left ?? null, value);
    } else if (value > node.value) {
      node.right = this._insert(node.right ?? null, value);
    } else {
      // Duplicate values are not allowed in this implementation
      return node;
    }

    // 2. Update height of this ancestor node
    this._updateHeight(node);

    // 3. Get the balance factor of this ancestor node to check whether this node became unbalanced
    const balance = this._getBalanceFactor(node);

    // 4. If this node becomes unbalanced, then there are 4 cases

    // Left Left Case
    if (balance > 1 && value < (node.left ?? null)!.value) {
      return this._rightRotate(node);
    }

    // Right Right Case
    if (balance < -1 && value > (node.right ?? null)!.value) {
      return this._leftRotate(node);
    }

    // Left Right Case
    if (balance > 1 && value > (node.left ?? null)!.value) {
      node.left = this._leftRotate(node.left!);
      return this._rightRotate(node);
    }

    // Right Left Case
    if (balance < -1 && value < (node.right ?? null)!.value) {
      node.right = this._rightRotate(node.right!);
      return this._leftRotate(node);
    }

    // 5. Return the (unchanged) node pointer
    return node;
  }

  // Returns the search path (for highlighting)
  searchPath(value: number): AvlTreeNode[] { // Updated type
    const path: AvlTreeNode[] = []; // Updated type
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

    let xIndex = 0; // In-order index, used for x-coordinate
    const horizontalSpacing = 80; // Horizontal spacing between nodes
    const verticalSpacing = 100; // Vertical spacing between levels

    // First perform in-order traversal and assign coordinates
    const assignCoords = (node: AvlTreeNode | null, depth: number): void => { // Updated type
      if (!node) return;

      // Left subtree
      assignCoords(node.left ?? null, depth + 1);

      // Current node
      node.x = xIndex * horizontalSpacing + 100; // Add 100 for centering
      node.y = depth * verticalSpacing + 100;
      xIndex++;

      // Right subtree
      assignCoords(node.right ?? null, depth + 1);
    };

    // Then perform DFS to build graph structure (using assigned coordinates)
    const buildGraph = (node: AvlTreeNode | null) => { // Updated type
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
