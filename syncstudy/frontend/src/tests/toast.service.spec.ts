import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from '../app/core/services/toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ToastService] });
    service = TestBed.inject(ToastService);
  });

  it('démarre avec le signal toast à null', () => {
    expect(service.toast()).toBeNull();
  });

  it('show() sans type explicite → signal contient type "success" par défaut', () => {
    service.show('Opération réussie');
    expect(service.toast()?.message).toBe('Opération réussie');
    expect(service.toast()?.type).toBe('success');
  });

  it('show() avec type "error" → signal contient type "error"', () => {
    service.show('Une erreur est survenue', 'error');
    expect(service.toast()?.type).toBe('error');
    expect(service.toast()?.message).toBe('Une erreur est survenue');
  });

  it('show() avec type "info" → signal contient type "info"', () => {
    service.show('Information', 'info');
    expect(service.toast()?.type).toBe('info');
  });

  it('show() avec type "warning" → signal contient type "warning"', () => {
    service.show('Attention', 'warning');
    expect(service.toast()?.type).toBe('warning');
  });

  it('le toast est effacé automatiquement après exactement 5000 ms', fakeAsync(() => {
    service.show('Temporaire');
    expect(service.toast()).not.toBeNull();
    tick(5000);
    expect(service.toast()).toBeNull();
  }));

  it('le toast reste visible à 4999 ms (pas encore effacé)', fakeAsync(() => {
    service.show('Visible');
    tick(4999);
    expect(service.toast()).not.toBeNull();
    tick(1); // atteindre exactement 5000 ms
    expect(service.toast()).toBeNull();
  }));

  it('un deuxième show() écrase le message du premier', () => {
    service.show('Premier message');
    service.show('Deuxième message');
    expect(service.toast()?.message).toBe('Deuxième message');
  });

  it('chaque show() démarre son propre timer de 5 s indépendamment', fakeAsync(() => {
    service.show('Premier');
    tick(3000);                            // 3 s après le premier show()
    service.show('Deuxième');              // nouveau timer repart de 0
    tick(4999);
    expect(service.toast()?.message).toBe('Deuxième'); // toujours visible
    tick(1);                               // atteint 5000 ms du deuxième
    expect(service.toast()).toBeNull();
  }));
});
