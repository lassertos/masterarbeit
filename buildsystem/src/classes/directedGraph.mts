export class DirectedGraph<T = undefined> {
  protected _nodes: { name: string; data: T }[] = [];
  protected _edges: { from: string; to: string }[] = [];
  protected _circlesAllowed: boolean;

  constructor(circlesAllowed: boolean = true) {
    this._circlesAllowed = circlesAllowed;
  }

  get nodes() {
    return this._nodes;
  }

  get edges() {
    return this._edges;
  }

  get roots() {
    return this._nodes.filter(
      (node) => this._edges.filter((edge) => edge.to === node.name).length === 0
    );
  }

  get leaves() {
    return this._nodes.filter(
      (node) =>
        this._edges.filter((edge) => edge.from === node.name).length === 0
    );
  }

  public addNode(name: string, data: T) {
    if (this._nodes.find((node) => node.name === name)) {
      return;
    }
    this._nodes.push({ name, data });
  }

  public addEdge(from: string, to: string) {
    if (!this._nodes.find((node) => node.name === from)) {
      throw new Error(`Node with name "${from}" does not exist in the graph!`);
    }

    if (!this._nodes.find((node) => node.name === to)) {
      throw new Error(`Node with name "${to}" does not exist in the graph!`);
    }

    if (this._edges.find((edge) => edge.from === from && edge.to === to)) {
      return;
    }

    if (
      !this._circlesAllowed &&
      this._edges.find((edge) => edge.from === to && edge.to === from)
    ) {
      throw new Error("Introduced a circle into an acyclic graph!");
    }

    this._edges.push({ from, to });
  }

  public getParents(node: string): { name: string; data: T }[] {
    if (!this._nodes.find((n) => n.name === node)) {
      throw new Error(`Node with name "${node}" does not exist in the graph!`);
    }

    return this._edges
      .filter((edge) => edge.to === node)
      .map((edge) => {
        return this.nodes.find((n) => n.name === edge.from)!;
      });
  }

  public getDescendants(node: string): { name: string; data: T }[] {
    if (!this._nodes.find((n) => n.name === node)) {
      throw new Error(`Node with name "${node}" does not exist in the graph!`);
    }

    return this._edges
      .filter((edge) => edge.from === node)
      .map((edge) => {
        return this.nodes.find((n) => n.name === edge.to)!;
      });
  }

  public hasCircle(): boolean {
    const visited: string[] = [];

    for (const node of this._nodes) {
      if (visited.includes(node.name)) continue;

      if (this._hasCircle(node.name, [], visited)) return true;
    }

    return false;
  }

  private _hasCircle(
    node: string,
    stack: string[],
    visited: string[]
  ): boolean {
    visited.push(node);
    const descendants = this.getDescendants(node);

    if (!descendants) {
      return false;
    }

    for (const descendant of descendants) {
      if (
        stack.includes(descendant.name) ||
        this._hasCircle(descendant.name, [...stack, node], visited)
      ) {
        return true;
      }
    }

    return false;
  }

  public invertEdges() {
    this._edges = this._edges.map((edge) => {
      return {
        from: edge.to,
        to: edge.from,
      };
    });
  }
}
