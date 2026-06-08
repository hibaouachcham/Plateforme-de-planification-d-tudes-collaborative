# SyncStudy Frontend (Angular 17+)

Frontend officiel de SyncStudy, basé sur Angular 17+.

## Prérequis

- Node.js 20+
- npm 10+ (ou version compatible)
- Angular CLI 17+

## Installation

```bash
npm install
```

## Lancement en développement

```bash
ng serve
```

Application disponible sur `http://localhost:4200`.

## Build de production

```bash
ng build
```

## Tests unitaires

```bash
ng test
```

## Configuration environnement

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Variables importantes :
- `apiUrl`
- `socketUrl`

## Notes architecture

- Code Angular : `src/`
- Config workspace : `angular.json`
- Proxy dev : `proxy.conf.json`
