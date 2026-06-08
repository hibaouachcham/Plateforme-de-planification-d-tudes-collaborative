import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminService } from '../app/core/services/admin.service';
import { ToastService } from '../app/core/services/toast.service';
import { API_PATHS } from '../app/core/api/api.constants';
import { User } from '../app/core/models/user.model';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;
  let toastSpy: jasmine.Spy;

  /** Crée un User minimal pour les fixtures */
  const mockUser = (id: string, status: 'active' | 'suspended' = 'active'): User => ({
    id,
    name: `User ${id}`,
    email: `${id}@example.com`,
    role: 'student',
    status,
    joinedDate: '2024-01-01',
    school: 'ENSA',
    level: 'L3',
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminService, ToastService],
    });
    service  = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
    toastSpy = spyOn(TestBed.inject(ToastService), 'show');
  });

  afterEach(() => httpMock.verify()); // garantit qu'aucune requête n'est laissée en suspens

  // ── loadUsers() ──────────────────────────────────────────────────────────

  describe('loadUsers()', () => {

    it('TEST 1 — met loading à true pendant la requête, puis à false à la réponse', () => {
      // On appelle loadUsers() : le signal loading doit passer à true immédiatement
      service.loadUsers();
      expect(service.loading()).toBe(true);          // pendant la requête

      // On simule la réponse du serveur avec 1 utilisateur
      httpMock.expectOne(API_PATHS.adminUsers).flush([mockUser('u1')]);
      expect(service.loading()).toBe(false);          // après la réponse
    });

    it('TEST 2 — remplit le signal users avec exactement les données reçues', () => {
      service.loadUsers();
      // Simule une réponse avec 2 utilisateurs
      httpMock.expectOne(API_PATHS.adminUsers).flush([mockUser('u1'), mockUser('u2')]);

      // Le signal doit contenir les 2 utilisateurs dans le même ordre
      expect(service.users().length).toBe(2);
      expect(service.users()[0].id).toBe('u1');
      expect(service.users()[1].id).toBe('u2');
    });

    it('TEST 3 — remet loading à false même en cas d\'erreur HTTP', () => {
      service.loadUsers();
      // Simule une erreur réseau (ex: serveur hors-ligne)
      httpMock.expectOne(API_PATHS.adminUsers).error(new ProgressEvent('network_error'));
      // loading doit quand même revenir à false pour ne pas bloquer l'UI
      expect(service.loading()).toBe(false);
    });

  });

  // ── toggleStatus() ────────────────────────────────────────────────────────

  describe('toggleStatus()', () => {

    // Avant chaque test : charger un utilisateur actif dans le signal
    beforeEach(() => {
      service.loadUsers();
      httpMock.expectOne(API_PATHS.adminUsers).flush([mockUser('u1', 'active')]);
    });

    it('TEST 4 — envoie PUT avec { status: "suspended" } quand l\'utilisateur est actif', () => {
      service.toggleStatus('u1');
      // On vérifie la requête émise : méthode PUT et corps correct
      const req = httpMock.expectOne(API_PATHS.adminUserStatus('u1'));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'suspended' });
      req.flush(null);
    });

    it('TEST 5 — met le status à "suspended" dans le signal après un PUT réussi', () => {
      service.toggleStatus('u1');
      httpMock.expectOne(API_PATHS.adminUserStatus('u1')).flush(null);
      // Le signal doit refléter le nouveau statut sans recharger depuis le serveur
      expect(service.users().find(u => u.id === 'u1')?.status).toBe('suspended');
    });

    it('TEST 6 — un second toggleStatus() renvoie PUT { status: "active" } (toggle inverse)', () => {
      // 1er toggle : active → suspended
      service.toggleStatus('u1');
      httpMock.expectOne(API_PATHS.adminUserStatus('u1')).flush(null);
      // 2ème toggle : suspended → active
      service.toggleStatus('u1');
      const req = httpMock.expectOne(API_PATHS.adminUserStatus('u1'));
      expect(req.request.body).toEqual({ status: 'active' });
      req.flush(null);
      expect(service.users().find(u => u.id === 'u1')?.status).toBe('active');
    });

    it('TEST 7 — affiche un toast "suspendu" (type info) après un PUT réussi', () => {
      service.toggleStatus('u1');
      httpMock.expectOne(API_PATHS.adminUserStatus('u1')).flush(null);
      // Le message doit contenir le mot "suspendu" pour indiquer l'action
      expect(toastSpy).toHaveBeenCalledWith(jasmine.stringContaining('suspendu'), 'info');
    });

    it('TEST 8 — affiche un toast d\'erreur si le PUT échoue', () => {
      service.toggleStatus('u1');
      httpMock.expectOne(API_PATHS.adminUserStatus('u1')).error(new ProgressEvent('error'));
      // En cas d'échec, un toast de type "error" doit être affiché
      expect(toastSpy).toHaveBeenCalledWith(jasmine.stringContaining('Erreur'), 'error');
    });

    it('TEST 9 — n\'émet aucune requête HTTP si l\'ID est introuvable dans le signal', () => {
      // Si l'ID n'existe pas dans le signal, on ne fait rien (guard clause au début de la méthode)
      service.toggleStatus('id-inexistant');
      httpMock.expectNone(API_PATHS.adminUserStatus('id-inexistant'));
      // Le signal ne doit pas être modifié : u1 est toujours présent
      expect(service.users().length).toBe(1);
    });

  });

  // ── createUser() ─────────────────────────────────────────────────────────

  describe('createUser()', () => {

    const payload = {
      name: 'Alice Dupont', email: 'alice@example.com', password: 'Pass123!',
      school: 'ESI', level: 'Master 1', role: 'student',
    };

    it('TEST 10 — envoie POST à adminUsers et résout la promesse avec le user créé', (done) => {
      const created = mockUser('new-id');
      service.createUser(payload).then((u) => {
        // La promesse doit résoudre avec l'objet retourné par le serveur
        expect(u.id).toBe('new-id');
        done();
      });
      // Simule la réponse du serveur avec le user créé
      httpMock.expectOne(API_PATHS.adminUsers).flush(created);
    });

    it('TEST 11 — ajoute le nouvel utilisateur en tête du signal (index 0)', (done) => {
      // D'abord charger un user existant
      service.loadUsers();
      httpMock.expectOne(API_PATHS.adminUsers).flush([mockUser('u1')]);

      const created = mockUser('new-id');
      service.createUser(payload).then(() => {
        // Le nouvel utilisateur doit être en tête de liste
        expect(service.users()[0].id).toBe('new-id');
        expect(service.users().length).toBe(2); // u1 est toujours là
        done();
      });
      httpMock.expectOne(API_PATHS.adminUsers).flush(created);
    });

    it('TEST 12 — rejette la promesse en cas d\'erreur HTTP (ex: email déjà utilisé)', (done) => {
      service.createUser(payload).catch((err) => {
        // L'erreur HTTP doit être propagée via reject()
        expect(err).toBeTruthy();
        done();
      });
      httpMock.expectOne(API_PATHS.adminUsers).error(new ProgressEvent('error'));
    });

  });

  // ── deleteUser() ─────────────────────────────────────────────────────────

  describe('deleteUser()', () => {

    // Avant chaque test : 2 utilisateurs dans le signal
    beforeEach(() => {
      service.loadUsers();
      httpMock.expectOne(API_PATHS.adminUsers).flush([mockUser('u1'), mockUser('u2')]);
    });

    it('TEST 13 — envoie une requête DELETE à l\'URL correcte', () => {
      service.deleteUser('u1').subscribe();
      const req = httpMock.expectOne(API_PATHS.adminUserDelete('u1'));
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('TEST 14 — retire l\'utilisateur supprimé du signal', () => {
      service.deleteUser('u1').subscribe();
      httpMock.expectOne(API_PATHS.adminUserDelete('u1')).flush(null);
      // u1 ne doit plus être dans le signal
      expect(service.users().find(u => u.id === 'u1')).toBeUndefined();
      expect(service.users().length).toBe(1);
    });

    it('TEST 15 — conserve les autres utilisateurs après la suppression', () => {
      service.deleteUser('u1').subscribe();
      httpMock.expectOne(API_PATHS.adminUserDelete('u1')).flush(null);
      // u2 doit toujours être présent et intact
      expect(service.users()[0].id).toBe('u2');
    });

    it('TEST 16 — affiche un toast de confirmation après la suppression', () => {
      service.deleteUser('u1').subscribe();
      httpMock.expectOne(API_PATHS.adminUserDelete('u1')).flush(null);
      // Un toast de type "info" doit confirmer la suppression
      expect(toastSpy).toHaveBeenCalledWith(jasmine.stringContaining('supprimé'), 'info');
    });

  });

  // ── loadDashboard() ───────────────────────────────────────────────────────

  describe('loadDashboard()', () => {

    it('TEST 17 — met à jour le signal dashboardKPIs avec toutes les données reçues', () => {
      service.loadDashboard();
      httpMock.expectOne(API_PATHS.adminDashboard).flush({
        totalUsers:       42,
        activeUsers:      38,
        completionRate:   75,
        sessionsByStatus: { planned: 10, completed: 5, unscheduled: 2 },
        registrationsByDay: [],
        topSubjects:      [],
        usersByLevel:     {},
        hourlyActivity:   [],
        recentUsers:      [],
      });
      const kpis = service.dashboardKPIs();
      expect(kpis.totalUsers).toBe(42);
      expect(kpis.activeUsers).toBe(38);
      expect(kpis.completionRate).toBe(75);
      // Vérifie que le segment "unscheduled" est bien présent (ajouté dans la correction du donut)
      expect(kpis.sessionsByStatus['unscheduled']).toBe(2);
    });

    it('TEST 18 — conserve la forme EMPTY_KPIS (totalSessions = 0) en cas d\'erreur HTTP', () => {
      service.loadDashboard();
      httpMock.expectOne(API_PATHS.adminDashboard).error(new ProgressEvent('error'));
      // En cas d'erreur, le fallback doit garder totalSessions à 0
      expect(service.dashboardKPIs().totalSessions).toBe(0);
    });

  });

});
