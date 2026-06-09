import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { LightBeam, LightGlow } from '@axe/domain/tabletop/vision-scene';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  selector: 'table-beam-overlay',
  templateUrl: './table-beam-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  imports: [NgStyle, SafePipe],
})
export class TableBeamOverlayComponent {
  private readonly visionService = inject(VisionService);
  private readonly uiSignalService = inject(UiSignalService);

  readonly beams = computed<LightBeam[]>(() => this.visionService.lightBeams());
  readonly glows = computed<LightGlow[]>(() => this.visionService.lightGlows());

  protected beamBackground(beam: LightBeam): string {
    return 'linear-gradient(to bottom, ' + beam.color + ' 0%, transparent 88%)';
  }

  protected finStyle(beam: LightBeam, fin: string): Record<string, string> {
    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: beam.width + 'px',
      height: beam.height + 'px',
      'transform-origin': '0 0',
      transform: fin,
      'clip-path': beam.clip,
      opacity: '0.16',
      'pointer-events': 'none',
    };
  }

  protected glowBackground(glow: LightGlow): string {
    return 'radial-gradient(circle, ' + glow.color + ' 0%, transparent 72%)';
  }

  protected glowStyle(glow: LightGlow): Record<string, string> {
    let transform: string;
    if (glow.transform) {
      transform = glow.transform;
    } else {
      const rot = this.uiSignalService.tableViewRotation();
      const rx = rot?.x ?? 50;
      const ry = rot?.y ?? 0;
      const rz = rot?.z ?? 10;
      transform =
        'translate3d(' +
        glow.x +
        'px, ' +
        glow.y +
        'px, ' +
        glow.z +
        'px) rotateZ(' +
        -rz +
        'deg) rotateX(' +
        -rx +
        'deg) rotateY(' +
        -ry +
        'deg) translate(-50%, -50%)';
    }
    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: glow.size + 'px',
      height: glow.size + 'px',
      'border-radius': '50%',
      'transform-origin': '0 0',
      transform,
      opacity: '0.55',
      'pointer-events': 'none',
    };
  }
}
