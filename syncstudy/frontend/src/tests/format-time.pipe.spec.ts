import { FormatTimePipe } from '../app/shared/pipes/format-time.pipe';

/**
 * Tests unitaires pour FormatTimePipe.
 * Pipe pur (aucune dépendance Angular) → instancié directement, sans TestBed.
 *
 * Format attendu :
 *   < 1 heure  →  "MM:SS"    (minutes sur 2 chiffres, secondes sur 2 chiffres)
 *   ≥ 1 heure  →  "H:MM:SS"  (heures sans zéro devant)
 */
describe('FormatTimePipe', () => {
  let pipe: FormatTimePipe;

  beforeEach(() => {
    pipe = new FormatTimePipe();
  });

  // ── Cas limites inférieurs (< 1 heure) ───────────────────────────────────

  it('0 seconde → "00:00"', () => {
    expect(pipe.transform(0)).toBe('00:00');
  });

  it('1 seconde → "00:01"', () => {
    expect(pipe.transform(1)).toBe('00:01');
  });

  it('59 secondes → "00:59"', () => {
    expect(pipe.transform(59)).toBe('00:59');
  });

  it('60 secondes (1 min exactement) → "01:00"', () => {
    expect(pipe.transform(60)).toBe('01:00');
  });

  it('65 secondes (1 min 5 s) → "01:05"', () => {
    expect(pipe.transform(65)).toBe('01:05');
  });

  it('599 secondes (9 min 59 s) → "09:59"', () => {
    expect(pipe.transform(599)).toBe('09:59');
  });

  it('3599 secondes (59 min 59 s) → "59:59"', () => {
    expect(pipe.transform(3599)).toBe('59:59');
  });

  // ── Seuil à 1 heure ───────────────────────────────────────────────────────

  it('3600 secondes (1 h exactement) → "1:00:00"', () => {
    expect(pipe.transform(3600)).toBe('1:00:00');
  });

  // ── Au-delà de 1 heure ────────────────────────────────────────────────────

  it('3601 secondes (1 h 0 min 1 s) → "1:00:01"', () => {
    expect(pipe.transform(3601)).toBe('1:00:01');
  });

  it('3665 secondes (1 h 1 min 5 s) → "1:01:05"', () => {
    expect(pipe.transform(3665)).toBe('1:01:05');
  });

  it('7199 secondes (1 h 59 min 59 s) → "1:59:59"', () => {
    expect(pipe.transform(7199)).toBe('1:59:59');
  });

  it('7200 secondes (2 h exactement) → "2:00:00"', () => {
    expect(pipe.transform(7200)).toBe('2:00:00');
  });

  it('36000 secondes (10 h exactement) → "10:00:00"', () => {
    expect(pipe.transform(36000)).toBe('10:00:00');
  });

  // ── Vérification du zero-padding ─────────────────────────────────────────

  it('les minutes < 10 sont zero-paddées (ex : 1 h 5 min → "1:05:00")', () => {
    expect(pipe.transform(3900)).toBe('1:05:00'); // 3600 + 300
  });

  it('les secondes < 10 sont zero-paddées (ex : 5 s → "00:05")', () => {
    expect(pipe.transform(5)).toBe('00:05');
  });

  it('les heures ne sont PAS zero-paddées ("1:00:00" et non "01:00:00")', () => {
    expect(pipe.transform(3600)).toBe('1:00:00');
    expect(pipe.transform(3600)).not.toBe('01:00:00');
  });
});
