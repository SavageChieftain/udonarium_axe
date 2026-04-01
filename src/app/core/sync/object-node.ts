import { Logger } from '@axe/core/logging/logger';
import { Attributes } from '@axe/core/sync/attributes';
import { defineSyncObject as SyncObject, defineSyncVariable as SyncVar } from '@axe/core/sync/decorator-core';
import { GameObject, ObjectContext } from '@axe/core/sync/game-object';
import { InnerXml, ObjectSerializer, XmlAttributes } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { decodeEntityReference, encodeEntityReference } from '@axe/core/util/xml-util';

@SyncObject('node')
export class ObjectNode extends GameObject implements XmlAttributes, InnerXml {
  @SyncVar() value: number | string = '';
  @SyncVar() protected attributes: Attributes = {};
  @SyncVar() private parentIdentifier: string = '';
  @SyncVar() protected majorIndex: number = 0;
  @SyncVar() protected minorIndex: number = Math.random();

  get index(): number {
    return this.majorIndex + this.minorIndex;
  }
  set index(index: number) {
    this.majorIndex = index | 0;
    this.minorIndex = index - this.majorIndex;
    if (this.parent) this.parent.needsSort = true;
  }

  get parent(): ObjectNode | null {
    return ObjectStore.instance.get<ObjectNode>(this.parentIdentifier);
  }
  get parentId(): string {
    return this.parentIdentifier;
  }
  get parentIsAssigned(): boolean {
    return this.parentIdentifier.length > 0;
  }
  get parentIsUnknown(): boolean {
    return this.parentIsAssigned && ObjectStore.instance.get(this.parentIdentifier) == null;
  }
  get parentIsDestroyed(): boolean {
    return this.parentIsAssigned && ObjectStore.instance.isDeleted(this.parentIdentifier);
  }

  private _children: ObjectNode[] = [];
  get children(): ObjectNode[] {
    if (this.needsSort) {
      this.needsSort = false;
      this._children.sort((a, b) => a.index - b.index);
    }
    return [...this._children];
  }

  private static pendingChildrenByParentId: Record<string, ObjectNode[]> = {};
  private needsSort: boolean = true;

  // override
  destroy() {
    super.destroy();
    for (const child of [...this._children]) {
      child.destroy();
    }
    this._children = [];
  }

  // GameObject Lifecycle
  onStoreAdded() {
    super.onStoreAdded();
    this.initializeChildren();
  }

  // GameObject Lifecycle
  onStoreRemoved() {
    super.onStoreRemoved();
    if (this.parent) this.parent.removeChild(this);
  }

  // ObjectNode Lifecycle
  onChildAdded(_child: ObjectNode) {}

  // ObjectNode Lifecycle
  onChildRemoved(_child: ObjectNode) {}

  private _onChildAdded(child: ObjectNode) {
    this.onChildAdded(child);
    for (let current = this.parent; current && current !== this; current = current.parent) {
      current.onChildAdded(child);
    }
  }

  private _onChildRemoved(child: ObjectNode) {
    this.onChildRemoved(child);
    for (let current = this.parent; current && current !== this; current = current.parent) {
      current.onChildRemoved(child);
    }
  }

  private initializeChildren() {
    const objects = ObjectNode.pendingChildrenByParentId[this.identifier];
    if (objects == null) return;
    for (const object of objects) {
      if (object.parent === this) this.updateChildren(object);
    }
    delete ObjectNode.pendingChildrenByParentId[this.identifier];
  }

  private updateChildren(child: ObjectNode = this) {
    let index = this._children.indexOf(child);
    let isAdded = false;
    const isMyChild = child.parent === this;

    if (index < 0 && isMyChild) {
      this._children.push(child);
      index = this._children.length - 1;
      isAdded = true;
    } else if (index >= 0 && !isMyChild) {
      this._children.splice(index, 1);
      this._onChildRemoved(child);
      return;
    } else if (index < 0 && !isMyChild) {
      return;
    }

    const childrenLength = this._children.length;
    if (!childrenLength) return;
    const prevIndex = Math.max(0, index - 1);
    const nextIndex = Math.min(childrenLength - 1, index + 1);

    if (this._children[prevIndex].index > child.index || child.index > this._children[nextIndex].index)
      this.needsSort = true;
    if (isAdded) this._onChildAdded(child);
  }

  private updateIndexes() {
    const children = this.children;
    for (let i = 0; i < children.length; i++) {
      children[i].majorIndex = i;
      children[i].minorIndex = Math.random();
    }
  }

  appendChild<T extends ObjectNode>(child: T): T | null {
    if (child.contains(this)) return null;

    if (child.parent && child.parent !== this) child.parent.removeChild(child);

    const lastIndex = this.children.length > 0 ? this.children[this.children.length - 1].majorIndex + 1 : 0;

    child.parentIdentifier = this.identifier;
    child.majorIndex = lastIndex;
    child.minorIndex = Math.random();

    this.updateChildren(child);

    return child;
  }

  insertBefore<T extends ObjectNode>(child: T, reference: ObjectNode): T | null {
    if (child.contains(this)) return null;
    if (child === reference && child.parent === this) return child;

    if (child.parent && child.parent !== this) child.parent.removeChild(child);

    const index = this.children.indexOf(reference);
    if (index < 0) return this.appendChild(child);

    child.parentIdentifier = this.identifier;

    const prevIndex = index > 0 ? this.children[index - 1].index : 0;
    const diff = reference.index - prevIndex;
    const insertIndex = prevIndex + diff * (0.45 + 0.1 * Math.random());
    child.majorIndex = insertIndex | 0;
    child.minorIndex = insertIndex - child.majorIndex;

    this.updateChildren(child);
    if (diff < 1e-7) {
      this.updateIndexes();
    }

    return child;
  }

  removeChild<T extends ObjectNode>(child: T): T | null {
    const children = this.children;
    const index: number = children.indexOf(child);
    if (index < 0) return null;

    child.parentIdentifier = '';
    child.majorIndex = 0;
    child.minorIndex = Math.random();

    this.updateChildren(child);
    return child;
  }

  contains(child: ObjectNode): boolean {
    let parent = child.parent;
    while (parent) {
      if (parent === child) {
        Logger.error('[ObjectNode] 循環参照を検出', child);
        return false;
      }
      if (parent === this) return true;
      parent = parent.parent;
    }
    return false;
  }

  setAttribute(name: string, value: number | string) {
    this.attributes[name] = value;
    this.update();
  }

  getAttribute(name: string): string {
    if (this.attributes[name] == null) {
      return '';
    }
    return this.attributes[name] as string;
  }

  removeAttribute(name: string) {
    delete this.attributes[name];
    this.update();
  }

  toAttributes(): Attributes {
    return ObjectSerializer.toAttributes(this.attributes);
  }

  parseAttributes(attributes: NamedNodeMap) {
    ObjectSerializer.parseAttributes(this.attributes, attributes);
  }

  innerXml(): string {
    let xml = '';
    xml += encodeEntityReference(`${this.value}`);
    for (const child of this.children) {
      xml += ObjectSerializer.instance.toXml(child);
    }
    return xml;
  }

  parseInnerXml(element: Element) {
    const children = element.children;
    const length = children.length;
    if (length > 0) {
      for (let i = 0; i < length; i++) {
        const child = ObjectSerializer.instance.parseXml(children[i]);
        if (child instanceof ObjectNode) this.appendChild(child);
      }
    } else {
      this.value = decodeEntityReference(element.innerHTML);
    }
  }

  // override
  apply(context: ObjectContext) {
    const oldParent = this.parent;
    super.apply(context);
    if (oldParent && this.parent !== oldParent) oldParent.updateChildren(this);
    if (this.parent) {
      this.parent.updateChildren(this);
    } else if (this.parentIsAssigned) {
      if (!(this.parentIdentifier in ObjectNode.pendingChildrenByParentId)) {
        ObjectNode.pendingChildrenByParentId[this.parentIdentifier] = [];
      }
      ObjectNode.pendingChildrenByParentId[this.parentIdentifier].push(this);
    }
  }
}
