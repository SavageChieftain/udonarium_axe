import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageStorage } from '@axe/core/storage/image-storage';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
  DataElementType,
  DataElementViewMode,
} from '@axe/domain/data/data-element';
import { GameDataElementComponent } from '@axe/features/character/game-data-element/game-data-element.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function createDragEvent(clientY: number = 15): DragEvent {
  return {
    clientY,
    currentTarget: {
      getBoundingClientRect: () => ({ top: 0, height: 30 }),
    },
    dataTransfer: {
      dropEffect: 'move',
      effectAllowed: 'move',
      getData: vi.fn(() => ''),
      setData: vi.fn(),
    },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as DragEvent;
}

describe('GameDataElementComponent', () => {
  let component: GameDataElementComponent;
  let fixture: ComponentFixture<GameDataElementComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameDataElementComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameDataElementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('構造ドラッグ&ドロップ', () => {
    it('同じ親の中で要素を後ろへ移動できること', () => {
      const parent = DataElement.create('parent', '');
      const dragged = DataElement.create('dragged', '');
      const target = DataElement.create('target', '');
      const next = DataElement.create('next', '');
      parent.appendChild(dragged);
      parent.appendChild(target);
      parent.appendChild(next);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', dragged);
      fixture.detectChanges();
      component.onStructureDragStart(createDragEvent());

      fixture.componentRef.setInput('gameDataElement', target);
      fixture.detectChanges();
      const dropEvent = createDragEvent(29);
      component.onStructureDragOver(dropEvent);
      component.onStructureDrop(dropEvent);

      expect(parent.children.map((child) => child.name)).toEqual(['target', 'dragged', 'next']);
      expect(dropEvent.preventDefault).toHaveBeenCalled();
      expect(dropEvent.stopPropagation).toHaveBeenCalled();
    });

    it('フィールドをセクション直下へ移動できないこと', () => {
      const detail = DataElement.create('detail', '');
      const sourceSection = DataElement.create('source', '', { role: DataElementRole.SECTION });
      const targetSection = DataElement.create('target', '', { role: DataElementRole.SECTION });
      const field = DataElement.create('field', 'value');
      detail.appendChild(sourceSection);
      detail.appendChild(targetSection);
      sourceSection.appendChild(field);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', field);
      fixture.detectChanges();
      component.onStructureDragStart(createDragEvent());

      fixture.componentRef.setInput('depth', 0);
      fixture.componentRef.setInput('gameDataElement', targetSection);
      fixture.detectChanges();
      const dropEvent = createDragEvent(15);
      component.onStructureDragOver(dropEvent);
      component.onStructureDrop(dropEvent);

      expect(sourceSection.children).toEqual([field]);
      expect(targetSection.children).toEqual([]);
      expect(field.parent).toBe(sourceSection);
      expect(field.fieldRole).toBe(DataElementRole.FIELD);
    });

    it('グループをセクション直下へ移動できること', () => {
      const detail = DataElement.create('detail', '');
      const sourceSection = DataElement.create('source', '', { role: DataElementRole.SECTION });
      const targetSection = DataElement.create('target', '', { role: DataElementRole.SECTION });
      const group = DataElement.create('group', '', { role: DataElementRole.GROUP });
      group.appendChild(DataElement.create('field', 'value', { role: DataElementRole.FIELD }));
      detail.appendChild(sourceSection);
      detail.appendChild(targetSection);
      sourceSection.appendChild(group);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('depth', 1);
      fixture.componentRef.setInput('gameDataElement', group);
      fixture.detectChanges();
      component.onStructureDragStart(createDragEvent());

      fixture.componentRef.setInput('depth', 0);
      fixture.componentRef.setInput('gameDataElement', targetSection);
      fixture.detectChanges();
      const dropEvent = createDragEvent(15);
      component.onStructureDragOver(dropEvent);
      component.onStructureDrop(dropEvent);

      expect(sourceSection.children).toEqual([]);
      expect(targetSection.children).toContain(group);
      expect(group.parent).toBe(targetSection);
      expect(group.fieldRole).toBe(DataElementRole.GROUP);
    });

    it('DnDで前のグループ内へ移動できること', () => {
      const section = DataElement.create('section', '', { role: DataElementRole.SECTION });
      const group = DataElement.create('group', '', { role: DataElementRole.GROUP });
      const field = DataElement.create('field', 'value');
      section.appendChild(group);
      section.appendChild(field);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('depth', 1);
      fixture.componentRef.setInput('gameDataElement', field);
      fixture.detectChanges();

      component.onStructureDragStart(createDragEvent());

      fixture.componentRef.setInput('gameDataElement', group);
      fixture.detectChanges();
      const dropEvent = createDragEvent(15);
      component.onStructureDragOver(dropEvent);
      component.onStructureDrop(dropEvent);

      expect(section.children).toEqual([group]);
      expect(group.children).toContain(field);
      expect(field.parent).toBe(group);
      expect(field.fieldRole).toBe(DataElementRole.FIELD);
    });

    it('DnDでグループをグループ内へ移動できること', () => {
      const section = DataElement.create('section', '', { role: DataElementRole.SECTION });
      const targetGroup = DataElement.create('target', '', { role: DataElementRole.GROUP });
      const draggedGroup = DataElement.create('dragged', '', { role: DataElementRole.GROUP });
      draggedGroup.appendChild(DataElement.create('field', 'value', { role: DataElementRole.FIELD }));
      section.appendChild(draggedGroup);
      section.appendChild(targetGroup);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('depth', 1);
      fixture.componentRef.setInput('gameDataElement', draggedGroup);
      fixture.detectChanges();
      component.onStructureDragStart(createDragEvent());

      fixture.componentRef.setInput('gameDataElement', targetGroup);
      fixture.detectChanges();
      const dropEvent = createDragEvent(15);
      component.onStructureDragOver(dropEvent);
      component.onStructureDrop(dropEvent);

      expect(section.children).toEqual([targetGroup]);
      expect(targetGroup.children).toContain(draggedGroup);
      expect(draggedGroup.parent).toBe(targetGroup);
      expect(draggedGroup.fieldRole).toBe(DataElementRole.GROUP);
    });

    it('DnDでフィールドを親グループの後ろへ直置きできないこと', () => {
      const section = DataElement.create('section', '', { role: DataElementRole.SECTION });
      const group = DataElement.create('group', '', { role: DataElementRole.GROUP });
      const field = DataElement.create('field', 'value');
      section.appendChild(group);
      group.appendChild(field);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('depth', 2);
      fixture.componentRef.setInput('gameDataElement', field);
      fixture.detectChanges();

      component.onStructureDragStart(createDragEvent());

      fixture.componentRef.setInput('depth', 1);
      fixture.componentRef.setInput('gameDataElement', group);
      fixture.detectChanges();
      const dropEvent = createDragEvent(29);
      component.onStructureDragOver(dropEvent);
      component.onStructureDrop(dropEvent);

      expect(section.children).toEqual([group]);
      expect(group.children).toEqual([field]);
      expect(field.parent).toBe(group);
      expect(field.fieldRole).toBe(DataElementRole.FIELD);
    });

    it('行の追加ボタンで同じ親の次の位置にフィールドを追加できること', () => {
      const group = DataElement.create('group', '', { role: DataElementRole.GROUP });
      const hp = DataElement.create('HP', '');
      const mp = DataElement.create('MP', '');
      group.appendChild(hp);
      group.appendChild(mp);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', hp);
      fixture.detectChanges();

      component.addSiblingElement();

      expect(group.children.map((child) => child.name)).toEqual(['HP', 'タグ', 'MP']);
      expect((group.children[1] as DataElement).fieldRole).toBe(DataElementRole.FIELD);
    });

    it('行の追加時はタグ名が重複しないよう自動採番すること', () => {
      const detail = DataElement.create('detail', '');
      const section = DataElement.create('section', '', { role: DataElementRole.SECTION });
      const group = DataElement.create('group', '', { role: DataElementRole.GROUP });
      const existing = DataElement.create('タグ', '');
      detail.appendChild(section);
      section.appendChild(group);
      group.appendChild(existing);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', group);
      fixture.detectChanges();

      component.addElement();

      expect(group.children.map((child) => child.name)).toEqual(['タグ', 'タグ 2']);
    });

    it('重複するタグ名へのリネームは保存しないこと', () => {
      vi.useFakeTimers();
      try {
        const detail = DataElement.create('detail', '');
        const section = DataElement.create('section', '', { role: DataElementRole.SECTION });
        const group = DataElement.create('group', '', { role: DataElementRole.GROUP });
        const hp = DataElement.create('HP', '');
        const mp = DataElement.create('MP', '');
        detail.appendChild(section);
        section.appendChild(group);
        group.appendChild(hp);
        group.appendChild(mp);

        fixture.componentRef.setInput('isEdit', true);
        fixture.componentRef.setInput('gameDataElement', hp);
        fixture.detectChanges();

        component.name = 'MP';
        expect(component.isDuplicateName()).toBe(true);

        vi.advanceTimersByTime(70);

        expect(hp.name).toBe('HP');
        expect(component.name).toBe('HP');
      } finally {
        vi.useRealTimers();
      }
    });

    it('別グループ内の同じタグ名へのリネームは許可すること', () => {
      vi.useFakeTimers();
      try {
        const detail = DataElement.create('detail', '');
        const section = DataElement.create('section', '', { role: DataElementRole.SECTION });
        const groupA = DataElement.create('groupA', '', { role: DataElementRole.GROUP });
        const groupB = DataElement.create('groupB', '', { role: DataElementRole.GROUP });
        const nameA = DataElement.create('名称', 'A');
        const nameB = DataElement.create('名前', 'B');
        detail.appendChild(section);
        section.appendChild(groupA);
        section.appendChild(groupB);
        groupA.appendChild(nameA);
        groupB.appendChild(nameB);

        fixture.componentRef.setInput('isEdit', true);
        fixture.componentRef.setInput('gameDataElement', nameB);
        fixture.detectChanges();

        component.name = '名称';
        expect(component.isDuplicateName()).toBe(false);

        vi.advanceTimersByTime(70);

        expect(nameB.name).toBe('名称');
      } finally {
        vi.useRealTimers();
      }
    });

    it('参照名コピーでパス形式のタグ名を書き込むこと', () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
      try {
        const detail = DataElement.create('detail', '');
        const section = DataElement.create('戦闘特技', '', { role: DataElementRole.SECTION });
        const group = DataElement.create('最終能力', '', { role: DataElementRole.GROUP });
        const field = DataElement.create('コスト', 'なし');
        detail.appendChild(section);
        section.appendChild(group);
        group.appendChild(field);

        fixture.componentRef.setInput('isEdit', true);
        fixture.componentRef.setInput('gameDataElement', field);
        fixture.detectChanges();

        component.copyReferencePath();

        expect(writeText).toHaveBeenCalledWith('戦闘特技/最終能力/コスト');
      } finally {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: originalClipboard,
        });
      }
    });

    it('セクション直下ではフィールドを追加できないこと', () => {
      const section = DataElement.create('section', '', { role: DataElementRole.SECTION });

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('depth', 0);
      fixture.componentRef.setInput('gameDataElement', section);
      fixture.detectChanges();

      component.addElement();

      expect(section.children).toEqual([]);
      expect(component.canAddChildFieldElement()).toBe(false);
      expect(component.canAddChildGroupElement()).toBe(true);
    });

    it('見出しの追加ボタンでグループを追加できること', () => {
      const section = DataElement.create('section', '', { role: DataElementRole.SECTION });

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', section);
      fixture.detectChanges();

      component.addGroupElement();

      const group = section.children[0] as DataElement;
      expect(group.name).toBe('グループ');
      expect(group.fieldRole).toBe(DataElementRole.GROUP);
      expect(group.children).toHaveLength(1);
      expect((group.children[0] as DataElement).fieldRole).toBe(DataElementRole.FIELD);
    });

    it('最上位見出しから内部にグループを追加できること', () => {
      const detail = DataElement.create('detail', '');
      const section = DataElement.create('section', '', { role: DataElementRole.SECTION });
      const next = DataElement.create('next', '', { role: DataElementRole.SECTION });
      const field = DataElement.create('field', 'value', { role: DataElementRole.FIELD });
      detail.appendChild(section);
      detail.appendChild(next);
      section.appendChild(field);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('depth', 0);
      fixture.componentRef.setInput('gameDataElement', section);
      fixture.detectChanges();

      component.addGroupElement();

      expect(detail.children.map((child) => child.name)).toEqual(['section', 'next']);
      expect(section.children.map((child) => child.name)).toEqual(['field', 'グループ']);
      expect((section.children[1] as DataElement).fieldRole).toBe(DataElementRole.GROUP);
      expect((section.children[1] as DataElement).children[0].fieldRole).toBe(DataElementRole.FIELD);
    });

    it('グループから下位グループを追加できること', () => {
      const section = DataElement.create('section', '', { role: DataElementRole.SECTION });
      const group = DataElement.create('group', '', { role: DataElementRole.GROUP });
      const next = DataElement.create('next', '', { role: DataElementRole.GROUP });
      section.appendChild(group);
      section.appendChild(next);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', group);
      fixture.detectChanges();

      component.addGroupElement();

      expect(section.children.map((child) => child.name)).toEqual(['group', 'next']);
      expect(group.children.map((child) => child.name)).toEqual(['グループ']);
      expect((group.children[0] as DataElement).fieldRole).toBe(DataElementRole.GROUP);
      expect((group.children[0] as DataElement).children[0].fieldRole).toBe(DataElementRole.FIELD);
    });

    it('3段階目のグループから下位グループを追加できないこと', () => {
      const section = DataElement.create('section', '', { role: DataElementRole.SECTION });
      const group = DataElement.create('group', '', { role: DataElementRole.GROUP });
      const nestedGroup = DataElement.create('nested', '', { role: DataElementRole.GROUP });
      section.appendChild(group);
      group.appendChild(nestedGroup);

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('depth', 2);
      fixture.componentRef.setInput('gameDataElement', nestedGroup);
      fixture.detectChanges();

      component.addGroupElement();

      expect(nestedGroup.children).toEqual([]);
      expect(component.canAddChildGroupElement()).toBe(false);
      expect(component.canAddChildFieldElement()).toBe(true);
    });

    it('コンテナの表示モードをテーブルへ切り替えられること', () => {
      const group = DataElement.create('group', '', { role: DataElementRole.GROUP });

      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', group);
      fixture.detectChanges();

      component.toggleTableViewMode();

      expect(group.viewMode).toBe(DataElementViewMode.TABLE);
      expect(component.isTableViewMode()).toBe(true);

      component.toggleTableViewMode();

      expect(group.viewMode).toBe(DataElementViewMode.NORMAL);
    });

    it('テーブル表示モードでは閲覧時だけ子グループを行として表示すること', () => {
      const section = DataElement.create('戦闘特技', '', {
        role: DataElementRole.SECTION,
        viewMode: DataElementViewMode.TABLE,
      });
      const skillA = DataElement.create('最終能力', '', { role: DataElementRole.GROUP });
      const skillB = DataElement.create('Lv1', '', { role: DataElementRole.GROUP });
      skillA.appendChild(DataElement.create('名称', 'オーバークリエイト'));
      skillA.appendChild(DataElement.create('コスト', 'なし'));
      skillB.appendChild(DataElement.create('名称', 'ストラグチャアタック'));
      skillB.appendChild(DataElement.create('コスト', '3'));
      section.appendChild(skillA);
      section.appendChild(skillB);

      fixture.componentRef.setInput('isEdit', false);
      fixture.componentRef.setInput('gameDataElement', section);
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('.elm-view-table') as HTMLTableElement | null;
      expect(table).toBeTruthy();
      expect(table?.textContent).toContain('名称');
      expect(table?.textContent).toContain('コスト');
      expect(table?.textContent).toContain('最終能力');
      expect(table?.textContent).toContain('オーバークリエイト');

      fixture.componentRef.setInput('isEdit', true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.elm-view-table')).toBeNull();
    });

    it('テーブル表示モードは列表示名とギャップ列を反映すること', () => {
      const section = DataElement.create('技能表', '', {
        role: DataElementRole.SECTION,
        viewMode: DataElementViewMode.TABLE,
      });
      const gapRow = DataElement.create('ギャップ', '', { role: DataElementRole.GROUP });
      gapRow.appendChild(
        DataElement.create('技巧', '', {
          role: DataElementRole.FIELD,
          fieldType: DataElementFieldType.TEXT,
          columnLabel: '技巧',
        })
      );
      gapRow.appendChild(
        DataElement.create('ギャップ1', 0, {
          role: DataElementRole.FIELD,
          fieldType: DataElementFieldType.CHECK,
          cellKind: 'gap',
          cellText: '技巧-身体',
          columnLabel: 'G',
        })
      );
      const gapCell = gapRow.getFirstElementByName('ギャップ1')!;
      gapRow.appendChild(
        DataElement.create('身体', '', {
          role: DataElementRole.FIELD,
          fieldType: DataElementFieldType.TEXT,
          columnLabel: '身体',
        })
      );
      const row2 = DataElement.create('2', '', { role: DataElementRole.GROUP });
      row2.appendChild(
        DataElement.create('技巧', 1, {
          role: DataElementRole.FIELD,
          fieldType: DataElementFieldType.CHECK,
          cellText: '解錠',
          columnLabel: '技巧',
        })
      );
      row2.appendChild(
        DataElement.create('身体', 0, {
          role: DataElementRole.FIELD,
          fieldType: DataElementFieldType.CHECK,
          cellText: '跳躍',
          columnLabel: '身体',
        })
      );
      section.appendChild(gapRow);
      section.appendChild(row2);

      fixture.componentRef.setInput('isEdit', false);
      fixture.componentRef.setInput('gameDataElement', section);
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('.elm-view-table') as HTMLTableElement | null;
      const gapColumns = fixture.nativeElement.querySelectorAll('.elm-view-table-column--gap');
      const gapHeader = fixture.nativeElement.querySelector('th.elm-view-table-column--gap') as HTMLElement | null;
      expect(gapHeader?.querySelector('input[type="checkbox"]')).toBeTruthy();
      expect(table?.textContent).not.toContain('ギャップ');
      expect(table?.textContent).not.toContain('技巧-身体');
      expect(table?.textContent).toContain('解錠');
      expect(gapColumns.length).toBeGreaterThan(0);

      gapHeader?.click();
      fixture.detectChanges();

      expect(gapCell.value).toBe(1);
      expect(fixture.nativeElement.querySelector('.elm-view-table-column--gap-active')).toBeTruthy();
    });

    it('テーブル表示モードは列グループ、行見出し、選択セルを反映すること', () => {
      const section = DataElement.create('技能表タイプ2', '', {
        role: DataElementRole.SECTION,
        viewMode: DataElementViewMode.TABLE,
        rowHeaderLabel: '技能',
      });
      const row = DataElement.create('行1', '', { role: DataElementRole.GROUP });
      row.appendChild(
        DataElement.create('肉体技能名', '肉体攻撃', {
          role: DataElementRole.FIELD,
          fieldType: DataElementFieldType.TEXT,
          columnLabel: '技能',
          columnGroup: '肉体技能',
        })
      );
      const rankCell = DataElement.create('肉体技能習熟度', '初級', {
        role: DataElementRole.FIELD,
        fieldType: DataElementFieldType.SELECT,
        choices: '初級,中級,上級',
        columnLabel: '習熟度',
        columnGroup: '肉体技能',
      });
      row.appendChild(rankCell);
      section.appendChild(row);

      fixture.componentRef.setInput('isEdit', false);
      fixture.componentRef.setInput('gameDataElement', section);
      fixture.detectChanges();

      const groupHeader = fixture.nativeElement.querySelector('.elm-view-table-column-group') as HTMLElement | null;
      const rowHeader = fixture.nativeElement.querySelector('.elm-view-table-row-heading--group') as HTMLElement | null;
      const select = fixture.nativeElement.querySelector('.elm-view-table-select') as HTMLSelectElement | null;
      expect(groupHeader?.textContent?.trim()).toBe('肉体技能');
      expect(groupHeader?.getAttribute('colspan')).toBe('2');
      expect(rowHeader?.textContent?.trim()).toBe('技能');
      expect(fixture.nativeElement.textContent).toContain('肉体攻撃');
      expect(select?.value).toBe('初級');

      select!.value = '上級';
      select!.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(rankCell.value).toBe('上級');
    });

    it('テーブル表示モードの画像セルは画像として表示すること', () => {
      const image = ImageStorage.instance.add('table-image.png');
      try {
        const section = DataElement.create('画像一覧', '', {
          role: DataElementRole.SECTION,
          viewMode: DataElementViewMode.TABLE,
        });
        const row = DataElement.create('行1', '', { role: DataElementRole.GROUP });
        row.appendChild(
          DataElement.create('立ち絵', image.identifier, {
            fieldType: DataElementFieldType.IMAGE,
            role: DataElementRole.FIELD,
          })
        );
        section.appendChild(row);

        fixture.componentRef.setInput('isEdit', false);
        fixture.componentRef.setInput('gameDataElement', section);
        fixture.detectChanges();

        const table = fixture.nativeElement.querySelector('.elm-view-table') as HTMLTableElement | null;
        const imageElement = fixture.nativeElement.querySelector('.elm-view-table-image') as HTMLImageElement | null;
        expect(table?.textContent).not.toContain('画像');
        expect(imageElement).toBeTruthy();
        expect(imageElement?.getAttribute('src')).toBe('table-image.png');
        expect(imageElement?.getAttribute('alt')).toBe('立ち絵');
      } finally {
        ImageStorage.instance.delete(image.identifier);
      }
    });

    it('子グループだけを持つ行がある場合はテーブル化せず通常表示で中身を保持すること', () => {
      const section = DataElement.create('戦闘特技', '', {
        role: DataElementRole.SECTION,
        viewMode: DataElementViewMode.TABLE,
      });
      const skillList = DataElement.create('スキル一覧', '', { role: DataElementRole.GROUP });
      const nestedSkill = DataElement.create('最終能力', '', { role: DataElementRole.GROUP });
      nestedSkill.appendChild(DataElement.create('名称', 'オーバークリエイト'));
      skillList.appendChild(nestedSkill);
      section.appendChild(skillList);

      fixture.componentRef.setInput('isEdit', false);
      fixture.componentRef.setInput('gameDataElement', section);
      fixture.detectChanges();

      expect(component.shouldRenderTableView()).toBe(false);
      expect(fixture.nativeElement.querySelector('.elm-view-table')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('スキル一覧');
      expect(fixture.nativeElement.textContent).toContain('最終能力');
      expect(fixture.nativeElement.textContent).toContain('名称');
      expect(fixture.nativeElement.textContent).toContain('オーバークリエイト');
    });

    it('テーブル表示のホイール操作で横スクロールできること', () => {
      const scrollElement = document.createElement('div');
      Object.defineProperty(scrollElement, 'clientWidth', { configurable: true, value: 200 });
      Object.defineProperty(scrollElement, 'scrollWidth', { configurable: true, value: 600 });
      scrollElement.scrollLeft = 0;
      const event = {
        currentTarget: scrollElement,
        deltaX: 0,
        deltaY: 120,
        preventDefault: vi.fn(),
      } as unknown as WheelEvent;

      component.onTableWheel(event);

      expect(scrollElement.scrollLeft).toBe(120);
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('カスタムフィールド型', () => {
    it('fieldType変更時に互換typeも更新すること', () => {
      const element = DataElement.create('HP', 10);
      fixture.componentRef.setInput('gameDataElement', element);
      fixture.detectChanges();

      component.setElementFieldType(DataElementFieldType.RESOURCE);

      expect(element.fieldType).toBe(DataElementFieldType.RESOURCE);
      expect(element.type).toBe(DataElementType.NUMBER_RESOURCE);
    });

    it('リソース表示モードではrangeではなく数値入力だけを表示すること', () => {
      const element = DataElement.create('HP', 200, {
        currentValue: 120,
        fieldType: DataElementFieldType.RESOURCE,
        type: DataElementType.NUMBER_RESOURCE,
      });
      fixture.componentRef.setInput('isEdit', false);
      fixture.componentRef.setInput('gameDataElement', element);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.resource-range')).toBeNull();
      expect(fixture.nativeElement.querySelector('input[type="range"]')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.resource-number')).toHaveLength(2);
    });

    it('selectの選択肢を改行とカンマから取得できること', () => {
      const element = DataElement.create('種族', '', { choices: '人間, エルフ\nドワーフ' });
      fixture.componentRef.setInput('gameDataElement', element);
      fixture.detectChanges();

      expect(component.getSelectOptions()).toEqual(['人間', 'エルフ', 'ドワーフ']);
    });

    it('field metadata を属性として更新できること', () => {
      const element = DataElement.create('種族', '人間', { fieldType: DataElementFieldType.SELECT });
      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', element);
      fixture.detectChanges();

      component.choicesText = '人間\nエルフ';
      component.unitText = '点';
      component.minText = '0';
      component.maxText = '100';

      expect(element.getAttribute(DataElementAttribute.CHOICES)).toBe('人間\nエルフ');
      expect(element.getAttribute(DataElementAttribute.UNIT)).toBe('点');
      expect(element.getAttribute(DataElementAttribute.MIN)).toBe('0');
      expect(element.getAttribute(DataElementAttribute.MAX)).toBe('100');

      component.unitText = '';

      expect(element.getAttribute(DataElementAttribute.UNIT)).toBe('');
    });

    it('テーブルセル用の表示メタデータを詳細設定から更新できること', () => {
      const table = DataElement.create('技能表', '', {
        role: DataElementRole.SECTION,
        viewMode: DataElementViewMode.TABLE,
      });
      const row = DataElement.create('ギャップ', '', { role: DataElementRole.GROUP });
      const cell = DataElement.create('ギャップ1', 0, {
        role: DataElementRole.FIELD,
        fieldType: DataElementFieldType.CHECK,
      });
      table.appendChild(row);
      row.appendChild(cell);
      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', cell);
      fixture.detectChanges();

      expect(component.shouldShowFieldOptions()).toBe(true);

      component.columnLabelText = 'G';
      component.columnGroupText = '技巧';
      component.tableCellText = '技巧-身体';
      component.isGapCell = true;

      expect(cell.getAttribute(DataElementAttribute.COLUMN_LABEL)).toBe('G');
      expect(cell.getAttribute(DataElementAttribute.COLUMN_GROUP)).toBe('技巧');
      expect(cell.getAttribute(DataElementAttribute.CELL_TEXT)).toBe('技巧-身体');
      expect(cell.getAttribute(DataElementAttribute.CELL_KIND)).toBe('gap');

      component.isGapCell = false;

      expect(cell.getAttribute(DataElementAttribute.CELL_KIND)).toBe('');
    });

    it('テーブルコンテナ用の行見出しを詳細設定から更新できること', () => {
      const table = DataElement.create('技能表タイプ2', '', {
        role: DataElementRole.SECTION,
        viewMode: DataElementViewMode.TABLE,
      });
      table.appendChild(DataElement.create('行1', '', { role: DataElementRole.GROUP }));
      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', table);
      fixture.detectChanges();

      expect(component.shouldShowContainerOptions()).toBe(true);

      component.rowHeaderLabelText = '技能';

      expect(table.getAttribute(DataElementAttribute.ROW_HEADER_LABEL)).toBe('技能');
    });

    it('calcフィールドの計算式を設定・取得できること', () => {
      const element = DataElement.create('合計', '', { fieldType: DataElementFieldType.CALC });
      fixture.componentRef.setInput('isEdit', true);
      fixture.componentRef.setInput('gameDataElement', element);
      fixture.detectChanges();

      component.formulaText = 'HP + MP';

      expect(element.getAttribute(DataElementAttribute.FORMULA)).toBe('HP + MP');
      expect(component.formulaText).toBe('HP + MP');
    });

    it('calcフィールドが兄弟フィールドの値から結果を計算できること', () => {
      const root = DataElement.create('detail', '');
      const hp = DataElement.create('HP', '30');
      const mp = DataElement.create('MP', '20');
      const calc = DataElement.create('合計', '', { fieldType: DataElementFieldType.CALC, formula: 'HP + MP' });
      root.appendChild(hp);
      root.appendChild(mp);
      root.appendChild(calc);

      fixture.componentRef.setInput('gameDataElement', calc);
      fixture.detectChanges();

      expect(component.calcResult()).toBe('50');
    });

    it('calcフィールドは重複する単純名を曖昧扱いしパス参照で計算できること', () => {
      const root = DataElement.create('detail', '');
      const section = DataElement.create('戦闘特技', '');
      const skillA = DataElement.create('最終能力', '');
      const skillB = DataElement.create('Lv1', '');
      const costA = DataElement.create('コスト', '3');
      const costB = DataElement.create('コスト', '5');
      const calc = DataElement.create('合計', '', {
        fieldType: DataElementFieldType.CALC,
        formula: '[戦闘特技/最終能力/コスト] + [戦闘特技/Lv1/コスト]',
      });
      root.appendChild(section);
      section.appendChild(skillA);
      section.appendChild(skillB);
      section.appendChild(calc);
      skillA.appendChild(costA);
      skillB.appendChild(costB);

      fixture.componentRef.setInput('gameDataElement', calc);
      fixture.detectChanges();

      expect(component.calcResult()).toBe('8');

      component.formulaText = 'コスト + 1';

      expect(component.calcResult()).toBe('?');
    });

    it('calcフィールドの式が無効な場合は?を返すこと', () => {
      const element = DataElement.create('合計', '', {
        fieldType: DataElementFieldType.CALC,
        formula: 'UNDEFINED_VAR',
      });
      fixture.componentRef.setInput('gameDataElement', element);
      fixture.detectChanges();

      expect(component.calcResult()).toBe('?');
    });
  });

  describe('editCheckedIds による URL 編集チェック状態管理', () => {
    it('changeChk で未登録のIDが追加されること', () => {
      component.changeChk('elem-1');
      expect(component.isEditUrl('elem-1')).toBe(true);
    });

    it('changeChk で登録済みのIDが削除されること', () => {
      component.changeChk('elem-1');
      component.changeChk('elem-1');
      expect(component.isEditUrl('elem-1')).toBe(false);
    });

    it('isEditUrl が未登録IDでfalseを返すこと', () => {
      expect(component.isEditUrl('unknown')).toBe(false);
    });

    it('textFocus でIDが追加されること', () => {
      component.textFocus('elem-2');
      expect(component.isEditUrl('elem-2')).toBe(true);
    });

    it('textFocus で既に登録済みのIDが維持されること', () => {
      component.changeChk('elem-3');
      component.textFocus('elem-3');
      expect(component.isEditUrl('elem-3')).toBe(true);
    });

    it('複数のIDを独立して管理できること', () => {
      component.changeChk('elem-a');
      component.changeChk('elem-b');
      expect(component.isEditUrl('elem-a')).toBe(true);
      expect(component.isEditUrl('elem-b')).toBe(true);

      component.changeChk('elem-a');
      expect(component.isEditUrl('elem-a')).toBe(false);
      expect(component.isEditUrl('elem-b')).toBe(true);
    });
  });
});
