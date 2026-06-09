import {
  ChatPaletteHandle,
  ChatPaletteRegistryService,
} from '@axe/features/chat/chat-palette/chat-palette-registry.service';

function handle(): ChatPaletteHandle {
  return { setCharacterById: vi.fn() };
}

describe('ChatPaletteRegistryService', () => {
  it('register で最後に登録したものが active になる', () => {
    const service = new ChatPaletteRegistryService();
    const a = handle();
    const b = handle();

    expect(service.active()).toBeNull();
    service.register(a);
    expect(service.active()).toBe(a);
    service.register(b);
    expect(service.active()).toBe(b);
  });

  it('active を unregister すると残りの最後のものに戻る', () => {
    const service = new ChatPaletteRegistryService();
    const a = handle();
    const b = handle();
    service.register(a);
    service.register(b);

    service.unregister(b);
    expect(service.active()).toBe(a);
    service.unregister(a);
    expect(service.active()).toBeNull();
  });

  it('active でないものを unregister しても active は変わらない', () => {
    const service = new ChatPaletteRegistryService();
    const a = handle();
    const b = handle();
    service.register(a);
    service.register(b);

    service.unregister(a);
    expect(service.active()).toBe(b);
  });
});
