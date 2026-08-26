import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from '@axe/application/ui/modal.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatColorSettingComponent } from '@axe/features/chat/chat-color-setting/chat-color-setting.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatColorSettingComponent', () => {
  let fixture: ComponentFixture<ChatColorSettingComponent>;
  let component: ChatColorSettingComponent;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ChatColorSettingComponent],
      providers: [...TEST_PROVIDERS, { provide: ModalService, useValue: { option: {} } }],
    }).compileComponents();

    PeerCursor.createMyCursor().name = 'Somebody';
    fixture = TestBed.createComponent(ChatColorSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the colour on both sides of the page, so the reader sees what it costs on either', () => {
    const host = fixture.nativeElement as HTMLElement;
    const bubbles = host.querySelectorAll<HTMLElement>('[style*="background-color"]');

    expect(component.themes).toEqual(['light', 'dark']);
    // Three colours on each of the two themes, plus the panel each set of three sits on.
    expect(bubbles.length).toBeGreaterThanOrEqual(component.themes.length * component.slots.length);
  });

  it('reads the sample under the name the message would carry', () => {
    expect(component.speakerName).toBe('Somebody');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Somebody');
  });
});
