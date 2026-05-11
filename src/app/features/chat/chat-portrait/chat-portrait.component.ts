import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChatPortraitImageComponent as ChatPortraitImageComponent_1 } from '@axe/features/chat/chat-portrait-img/chat-portrait-img.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-portrait',
  templateUrl: './chat-portrait.component.html',
  imports: [ChatPortraitImageComponent_1],
})
export class ChatPortraitComponent {
  readonly chatTabidentifier = input('');
}
