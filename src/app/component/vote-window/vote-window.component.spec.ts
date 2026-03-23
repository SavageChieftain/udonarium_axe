import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { Vote } from '@axe/class/vote';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { VoteWindowComponent } from './vote-window.component';

describe('VoteWindowComponent', () => {
  let component: VoteWindowComponent;
  let fixture: ComponentFixture<VoteWindowComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [VoteWindowComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    // Create and register Vote singleton
    const vote = new Vote('Vote');
    vote.initTimeStamp = Date.now();
    ObjectStore.instance.add(vote);

    fixture = TestBed.createComponent(VoteWindowComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Clean up ObjectStore after each test
    ObjectStore.instance.delete('Vote');
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
