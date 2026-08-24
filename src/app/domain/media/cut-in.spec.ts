import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CUT_IN_TITLE_BAR_HEIGHT, CutIn, cutInPanelChrome } from '@axe/domain/media/cut-in';

describe('CutIn', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('the defaults of the synchronised fields', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
    });

    it('starts with the default name', () => {
      expect(cutIn.name).toBe('カットイン');
    });

    it('starts at the default width', () => {
      expect(cutIn.width).toBe(480);
    });

    it('starts at the default height', () => {
      expect(cutIn.height).toBe(320);
    });

    it('starts at its original size', () => {
      expect(cutIn.originalSize).toBe(true);
    });

    it('starts halfway across', () => {
      expect(cutIn.x_pos).toBe(50);
    });

    it('starts halfway down', () => {
      expect(cutIn.y_pos).toBe(50);
    });

    it('starts without looping', () => {
      expect(cutIn.isLoop).toBe(false);
    });

    it('starts without the chat trigger', () => {
      expect(cutIn.chatActivate).toBe(false);
    });

    it('starts stopped', () => {
      expect(cutIn.isPlaying).toBe(false);
    });

    it('starts as something other than a video', () => {
      expect(cutIn.isVideoCutIn).toBe(false);
    });

    it('starts with no address', () => {
      expect(cutIn.videoUrl).toBe('');
    });

    it('starts at half volume', () => {
      expect(cutIn.videoVolume).toBe(50);
    });

    it('starts wearing a frame', () => {
      expect(cutIn.frameless).toBe(false);
    });
  });

  describe('cutInPanelChrome()', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
    });

    it('leaves room for the title bar of a framed cut-in', () => {
      expect(cutInPanelChrome(cutIn)).toBe(CUT_IN_TITLE_BAR_HEIGHT);
    });

    it('leaves no room above a frameless one', () => {
      cutIn.frameless = true;
      expect(cutInPanelChrome(cutIn)).toBe(0);
    });
  });

  describe('minSize / maxSize', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
    });

    it('the narrowest an ordinary cut-in may be', () => {
      expect(cutIn.minSizeWidth(false)).toBe(10);
    });

    it('the widest', () => {
      expect(cutIn.maxSizeWidth(false)).toBe(1200);
    });

    it('the narrowest a video may be', () => {
      expect(cutIn.minSizeWidth(true)).toBe(448);
    });

    it('the widest', () => {
      expect(cutIn.maxSizeWidth(true)).toBe(1920);
    });

    it('the shortest an ordinary cut-in may be', () => {
      expect(cutIn.minSizeHeight(false)).toBe(10);
    });

    it('the shortest a video may be', () => {
      expect(cutIn.minSizeHeight(true)).toBe(252);
    });

    it('the tallest an ordinary cut-in may be', () => {
      expect(cutIn.maxSizeHeight(false)).toBe(1200);
    });

    it('the tallest a video may be', () => {
      expect(cutIn.maxSizeHeight(true)).toBe(1080);
    });
  });

  describe('defVideoSize', () => {
    it('the default width of a video', () => {
      const cutIn = new CutIn();
      cutIn.initialize();
      expect(cutIn.defVideoSizeWidth).toBe(640);
    });

    it('its default height', () => {
      const cutIn = new CutIn();
      cutIn.initialize();
      expect(cutIn.defVideoSizeHeight).toBe(360);
    });
  });

  describe('validUrl()', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
    });

    it('is true for a secure address', () => {
      expect(cutIn.validUrl('https://example.com')).toBe(true);
    });

    it('is true for a plain one', () => {
      expect(cutIn.validUrl('http://example.com')).toBe(true);
    });

    it('is false for an empty string', () => {
      expect(cutIn.validUrl('')).toBe(false);
    });

    it('is false for another scheme', () => {
      expect(cutIn.validUrl('ftp://example.com')).toBe(false);
    });

    it('is false for an address it cannot read', () => {
      expect(cutIn.validUrl('not a url')).toBe(false);
    });
  });

  describe('videoId', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
    });

    it('returns nothing for a cut-in that is not a video', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(cutIn.videoId).toBe('');
    });

    it('takes the identifier out of a full address', () => {
      cutIn.isVideoCutIn = true;
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(cutIn.videoId).toBe('dQw4w9WgXcQ');
    });

    it('takes it out of a shortened one', () => {
      cutIn.isVideoCutIn = true;
      cutIn.videoUrl = 'https://youtu.be/dQw4w9WgXcQ';
      expect(cutIn.videoId).toBe('dQw4w9WgXcQ');
    });

    it('returns nothing for an empty address', () => {
      cutIn.isVideoCutIn = true;
      cutIn.videoUrl = '';
      expect(cutIn.videoId).toBe('');
    });

    it('returns nothing for another host', () => {
      cutIn.isVideoCutIn = true;
      cutIn.videoUrl = 'https://vimeo.com/123456';
      expect(cutIn.videoId).toBe('');
    });

    it('takes it out of a short-form address', () => {
      cutIn.isVideoCutIn = true;
      cutIn.videoUrl = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
      expect(cutIn.videoId).toBe('dQw4w9WgXcQ');
    });

    it('takes it out of one carrying query parameters', () => {
      cutIn.isVideoCutIn = true;
      cutIn.videoUrl = 'https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share';
      expect(cutIn.videoId).toBe('dQw4w9WgXcQ');
    });
  });

  describe('videoStart', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
      cutIn.isVideoCutIn = true;
    });

    it('reads the seconds off the start parameter', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123&start=120';
      expect(cutIn.videoStart).toBe('120');
    });

    it('reads them off the time parameter', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123&t=60';
      expect(cutIn.videoStart).toBe('60');
    });

    it('reads them out of hours, minutes and seconds', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123&t=1h2m3s';
      expect(cutIn.videoStart).toBe('3723');
    });

    it('returns nothing when neither is there', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123';
      expect(cutIn.videoStart).toBeFalsy();
    });
  });

  describe('playListId', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
      cutIn.isVideoCutIn = true;
    });

    it('takes the playlist identifier out of the address', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123&list=PLtest123';
      expect(cutIn.playListId).toBe('PLtest123');
    });

    it('returns nothing when it is not there', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123';
      expect(cutIn.playListId).toBe('');
    });
  });
});
