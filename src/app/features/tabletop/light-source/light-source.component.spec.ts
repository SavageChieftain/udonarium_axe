import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { LightSource } from '@axe/domain/tabletop/light-source';
import { LightSourceComponent } from '@axe/features/tabletop/light-source/light-source.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('LightSourceComponent', () => {
  let component: LightSourceComponent;
  let fixture: ComponentFixture<LightSourceComponent>;
  let light: LightSource;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [LightSourceComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LightSourceComponent);
    component = fixture.componentInstance;
    light = LightSource.create('lantern');
    fixture.componentRef.setInput('lightSource', light);
  });

  afterEach(() => {
    light.destroy();
  });

  it('stands the picture up off the board', () => {
    expect(component.standTransform()).toBe('rotateX(-90deg) translateY(-50%)');
  });

  it('lifts a mounted light up the wall before standing it', () => {
    light.altitude = 1;

    expect(component.standTransform()).toBe('translateZ(50px) rotateX(-90deg) translateY(-50%)');
  });

  it('turns the picture back towards the camera, as a character piece does', () => {
    TestBed.inject(UiSignalService).notifyTableViewRotation(50, 0, 45);

    expect(component.skinTransform()).toContain('rotateX(90deg)');
    expect(component.skinTransform()).toContain('rotateZ(-45deg)');
    expect(component.skinTransform()).toContain('rotateX(-50deg)');
  });
});
