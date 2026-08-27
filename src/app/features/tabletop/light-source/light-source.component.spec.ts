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

  it('stands the picture on the middle of its cell, facing the camera', () => {
    TestBed.inject(UiSignalService).notifyTableViewRotation(50, 0, 45);

    expect(component.skinTransform()).toBe(
      'translateZ(25px) translateZ(0.00px) rotateZ(0deg) rotateZ(-45deg) rotateX(-50deg) rotateY(0deg)'
    );
  });

  it('lifts a light mounted up a wall by its altitude', () => {
    light.altitude = 1;

    expect(component.skinTransform()).toContain('translateZ(75px)');
  });
});
