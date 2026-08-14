import { TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { emitAlarmPop, emitAlarmTimeUp } from '@axe/core/event/domain-events';
import { AlarmEventHandlerService } from '@axe/features/alarm/alarm-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('AlarmEventHandlerService', () => {
  let chatStub: { sendSystemMessageAsLastSpeaker: ReturnType<typeof vi.fn> };
  let panelStub: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    chatStub = { sendSystemMessageAsLastSpeaker: vi.fn() };
    panelStub = { open: vi.fn().mockReturnValue({ title: '', time: '' }) };
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    TestBed.overrideProvider(ChatMessageService, { useValue: chatStub });
    TestBed.overrideProvider(PanelService, { useValue: panelStub });
    TestBed.inject(AlarmEventHandlerService);
  });

  it('sends a system message when the time is up', () => {
    emitAlarmTimeUp({ text: 'time up' });

    expect(chatStub.sendSystemMessageAsLastSpeaker).toHaveBeenCalledWith('time up');
  });

  it('opens the alarm panel with its title and time', () => {
    const componentMock = { title: '', time: '' };
    panelStub.open.mockReturnValue(componentMock);

    emitAlarmPop({ title: 'breakfast', time: 1234 });

    expect(panelStub.open).toHaveBeenCalledTimes(1);
    const [, option] = panelStub.open.mock.calls[0];
    expect(option.title).toContain('breakfast');
    expect(componentMock.title).toBe('breakfast');
    expect(componentMock.time).toBe('1234');
  });
});
