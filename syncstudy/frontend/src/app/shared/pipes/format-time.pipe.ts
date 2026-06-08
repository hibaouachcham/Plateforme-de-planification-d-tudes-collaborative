import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatTime', standalone: true })
export class FormatTimePipe implements PipeTransform {
  transform(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
}
