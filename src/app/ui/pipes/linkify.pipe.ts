import { Pipe, PipeTransform } from '@angular/core';
import linkifyHtml from 'linkify-html';

@Pipe({ name: 'linkify' })
export class LinkifyPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return linkifyHtml(String(value), { target: '_blank', rel: 'noopener noreferrer' });
  }
}
