# Scraping Algorithm — Skill Ingestion & Resource Resolution Pipeline

Pipeline deterministica per importare skill dal formato pubblico (skills.sh) nel database Omniscient, risolvere tutti i cross-reference tra skill e tra skill-risorse, e generare il grafo di link (`skill_link`).

## Panoramica

Il problema: le skill provengono da una directory `parsed-skills/` con file markdown e risorse locali. Il markdown contiene centinaia di riferimenti testuali (path relativi, URL, slug) che devono essere convertiti in token UUID-based (`[[skill:<uuid>]]`, `[[resource:<uuid>]]`) per il sistema di mentions di Omniscient.

La pipeline si compone di **4 script** eseguiti in sequenza:

```
parsed-skills/          ingest-skills.ts          resolve-resource-refs.ts       sync-all-links.ts
  slug/                 ─────────────────►  DB    ────────────────────────► DB   ──────────────────► DB
    SKILL.md              Pass 1: upsert          Testo → [[resource:uuid]]       skill_link entries
    references/*.md       Pass 2: [[skill:uuid]]
    scripts/*.ts
    assets/*
```

## Struttura file

```
scraping_algorythm/
├── README.md                      # Questo file
├── ingest-skills.ts               # Step 1: Importazione skill + risorse + cross-ref skill-to-skill
├── import-missing-resources.ts    # Step 2: Patch risorse mancanti dal disco
├── resolve-resource-refs.ts       # Step 3: Risolve riferimenti a risorse nel markdown
├── sync-all-links.ts              # Step 4: Genera skill_link dal markdown risolto
└── lib/
    ├── parse-skill-md.ts          # Parser YAML frontmatter + markdown body
    ├── scan-resources.ts          # Scanner ricorsivo per risorse (references, scripts, assets)
    └── resolve-references.ts      # Resolver cross-reference skill-to-skill (7 pattern)
```

---

## Step 1: `ingest-skills.ts` — Importazione skill

Legge le directory `parsed-skills/<slug>/` e popola il DB con un approccio a 2 pass.

### Pass 1 — Import skill e risorse

Per ogni cartella:

1. Legge `SKILL.md`, estrae frontmatter YAML (`name`, `description`) tramite `gray-matter`
2. Genera lo slug dal nome della cartella
3. Scansiona sottocartelle (`references/`, `scripts/`, `assets/`) con `scanResources()`
4. Upsert nella tabella `skill` (insert o update se lo slug esiste)
5. Upsert di ogni risorsa nella tabella `skill_resource`

### Pass 2 — Cross-reference skill-to-skill

1. Costruisce una `SlugMap`: `Map<slug, uuid>` da tutte le skill nel DB
2. Per ogni skill, scansiona il markdown con 7 pattern regex
3. Sostituisce i match con `[[skill:<uuid>]]`
4. Aggiorna il markdown nel DB

### Formato input su disco

```
parsed-skills/
├── copy-editing/
│   ├── SKILL.md                  # Frontmatter YAML + markdown
│   └── references/
│       └── plain-english.md      # Risorsa di tipo "reference"
├── web-artifacts-builder/
│   ├── SKILL.md
│   └── scripts/
│       ├── init-project.sh       # Risorsa di tipo "script"
│       └── bundle.sh
└── design-md/
    ├── SKILL.md
    └── assets/
        └── template.svg          # Risorsa di tipo "asset" (binari skippati)
```

### Frontmatter YAML

```yaml
---
name: copy-editing
description: "When the user wants to edit or improve marketing copy..."
metadata:
  version: 1.0.0
license: MIT
---
# Copy Editing

Il contenuto markdown della skill...
```

### Classificazione risorse

| Directory     | `kind` nel DB | Descrizione                        |
| ------------- | ------------- | ---------------------------------- |
| `references/` | `reference`   | Documenti di riferimento (.md)     |
| `scripts/`    | `script`      | Script eseguibili (.ts, .sh, .py)  |
| `assets/`     | `asset`       | File statici (template, config)    |
| altro         | `other`       | Fallback per directory non mappate |

### File binari skippati

Estensioni escluse dall'importazione (non possono essere salvate come UTF-8):

```
.png .jpg .jpeg .gif .webp .ico .svg
.ttf .otf .woff .woff2 .eot
.pdf .zip .gz .tar .bz2
.mp3 .mp4 .wav .ogg .webm
.exe .dll .so .dylib
.bin .dat .db .sqlite
```

### Usage

```bash
DATABASE_URL="..." bun run scraping_algorythm/ingest-skills.ts --dir ./parsed-skills -v
DATABASE_URL="..." bun run scraping_algorythm/ingest-skills.ts --dir ./parsed-skills --dry-run
```

---

## Step 2: `import-missing-resources.ts` — Patch risorse mancanti

Dopo il primo ingest, alcune risorse possono mancare nel DB (es. per timeout HTTP o limiti di richieste Neon). Questo script trova le differenze tra disco e DB e importa solo le mancanti.

### Algoritmo

1. Fetch tutte le skill e risorse esistenti dal DB
2. Costruisce un `Set<"skillId:path">` delle risorse già presenti
3. Per ogni skill, scansiona la directory su disco
4. Filtra le risorse non presenti nel Set
5. Inserisce le mancanti una per una con upsert

### Usage

```bash
DATABASE_URL="..." bun run scraping_algorythm/import-missing-resources.ts --dir ./parsed-skills -v
```

---

## Step 3: `resolve-resource-refs.ts` — Risoluzione riferimenti a risorse

Questo e' l'algoritmo centrale. Scansiona il markdown di ogni skill nel DB e sostituisce i riferimenti testuali a file locali con token `[[resource:<uuid>]]`.

### Pattern riconosciuti (10 tipi, ~578 occorrenze totali)

I pattern sono applicati in ordine di specificita' (piu' specifico prima):

#### 1. Markdown link con prefisso `./`

```
Input:  [Guida completa](./references/guide.md)
Output: [[resource:a1b2c3d4-...]]
Regex:  \[([^\]]+)\]\(\.\/(references|scripts|assets)\/([^)]+)\)
```

#### 2. Markdown link senza prefisso

```
Input:  [API Reference](references/api.md)
Output: [[resource:a1b2c3d4-...]]
Regex:  \[([^\]]+)\]\((references|scripts|assets)\/([^)]+)\)
```

#### 3. Freccia `→`

```
Input:  → references/configuration.md
Output: → [[resource:a1b2c3d4-...]]
Regex:  → (references|scripts|assets)\/(\S+)
```

#### 4. Bold `**...**`

```
Input:  **references/important-doc.md**
Output: [[resource:a1b2c3d4-...]]
Regex:  \*\*(references|scripts|assets)\/([^*]+)\*\*
```

#### 5. Backtick `` `...` ``

```
Input:  `references/commands.md`
Output: [[resource:a1b2c3d4-...]]
Regex:  `(references|scripts|assets)\/([^`]+)`
```

Ogni pattern copre le 3 directory: `references/`, `scripts/`, `assets/`.

### Normalizzazione path

Prima del lookup nel DB, il path viene normalizzato:

```
./references/file.md       → references/file.md     (rimuovi ./)
references/file.md#section → references/file.md     (rimuovi anchor)
references/file.md?query   → references/file.md     (rimuovi query string)
```

### Algoritmo di risoluzione

```
Per ogni skill nel DB:
  1. Fetch resourceMap: Map<path, uuid> per quella skill
  2. Se nessuna risorsa → skip
  3. Applica ogni regex in ordine sul markdown
  4. Per ogni match:
     a. Normalizza il path
     b. Cerca nel resourceMap
     c. Se trovato → sostituisci con [[resource:<uuid>]]
     d. Se non trovato → lascia invariato, aggiungi warning
  5. Se almeno un match risolto → UPDATE skill_markdown nel DB
```

### Perche' l'ordine conta

Il pattern `[text](./references/file.md)` deve essere processato PRIMA di `` `references/file.md` `` perche':

- Se processiamo prima il backtick, potremmo matchare un path gia' dentro un markdown link
- I pattern piu' specifici (con piu' contesto) sono piu' sicuri e hanno meno falsi positivi

### Usage

```bash
# Solo DB
DATABASE_URL="..." bun run scraping_algorythm/resolve-resource-refs.ts -v

# Anche file su disco
DATABASE_URL="..." bun run scraping_algorythm/resolve-resource-refs.ts -v --write-files --dir ./parsed-skills

# Preview senza modifiche
DATABASE_URL="..." bun run scraping_algorythm/resolve-resource-refs.ts -v --dry-run
```

---

## Step 4: `sync-all-links.ts` — Generazione grafo di link

Dopo che tutti i `[[skill:uuid]]` e `[[resource:uuid]]` sono nel markdown, questo script genera le entry nella tabella `skill_link` per materializzare il grafo di relazioni.

### Algoritmo

1. Fetch tutte le skill con il loro markdown
2. Per ogni skill, estrae le mention con regex: `\[\[(skill|resource):(<uuid>)\]\]`
3. Deduplica per `type:targetId`
4. Valida che gli UUID referenziati esistano nel DB
5. Cancella i link auto-generati esistenti (`metadata.origin = 'markdown-auto'`)
6. Inserisce nuovi `skill_link` con:
   - `source_skill_id`: la skill che contiene la mention
   - `target_skill_id` o `target_resource_id`: l'entita' referenziata
   - `kind`: `"mention"`
   - `metadata`: `{ origin: "markdown-auto" }`

### Usage

```bash
DATABASE_URL="..." bun run scraping_algorythm/sync-all-links.ts -v
DATABASE_URL="..." bun run scraping_algorythm/sync-all-links.ts -v --dry-run
```

---

## Librerie condivise (`lib/`)

### `parse-skill-md.ts`

Estrae frontmatter YAML e body markdown da un file SKILL.md usando `gray-matter`.

```typescript
interface ParsedSkill {
  frontmatter: Record<string, unknown>; // YAML key-value pairs
  name: string; // frontmatter.name
  description: string; // frontmatter.description
  markdown: string; // body senza frontmatter
}

function parseSkillMd(raw: string): ParsedSkill;
```

### `scan-resources.ts`

Scansiona ricorsivamente una directory skill e restituisce tutte le risorse trovate.

```typescript
interface SkillResourceEntry {
  path: string; // Path relativo (es. "references/guide.md")
  kind: ResourceKind; // "reference" | "script" | "asset" | "other"
  content: string; // Contenuto UTF-8
}

function scanResources(skillDir: string): Promise<SkillResourceEntry[]>;
```

Logica:

- Scansione ricorsiva di tutte le sotto-directory
- Salta `SKILL.md` (il file principale della skill)
- Salta directory con un proprio `SKILL.md` (nested skill duplicate)
- Salta file binari (vedi lista sopra)
- Classifica per directory padre o estensione

### `resolve-references.ts`

Risolve riferimenti testuali a ALTRE SKILL (non risorse) nel markdown.

7 pattern riconosciuti:

| #   | Pattern             | Esempio                                     |
| --- | ------------------- | ------------------------------------------- |
| 1   | Backtick + "skill"  | ``the `design-md` skill``                   |
| 2   | REQUIRED SUB-SKILL  | `**REQUIRED SUB-SKILL:** Use ns:skill-name` |
| 3   | `npx skills add`    | `npx skills add owner/repo@skill-name`      |
| 4   | URL skills.sh       | `https://skills.sh/owner/repo/skill-name`   |
| 5   | Related Skills bold | `- **copy-editing**: For polishing...`      |
| 6   | Related Skills link | `- [slug](path)`                            |
| 7   | Bold inline         | `**slug** skill`                            |

Gestisce namespace (`superpowers:skill-name` → estrae `skill-name`).

```typescript
function resolveReferences(markdown: string, slugMap: SlugMap): string;
function getReferencedSlugs(markdown: string): string[];
```

---

## Schema DB di riferimento

### `skill`

| Colonna          | Tipo      | Note                                            |
| ---------------- | --------- | ----------------------------------------------- |
| `id`             | uuid (PK) | Generato automaticamente                        |
| `owner_user_id`  | text      | NULL per skill piattaforma                      |
| `visibility`     | enum      | `"public"` / `"private"`                        |
| `slug`           | text      | Unique per le public (no owner)                 |
| `name`           | text      | Dal frontmatter                                 |
| `description`    | text      | Dal frontmatter                                 |
| `skill_markdown` | text      | Body con `[[skill:uuid]]` e `[[resource:uuid]]` |
| `frontmatter`    | jsonb     | YAML frontmatter completo                       |

### `skill_resource`

| Colonna    | Tipo      | Note                                               |
| ---------- | --------- | -------------------------------------------------- |
| `id`       | uuid (PK) | Generato automaticamente                           |
| `skill_id` | uuid (FK) | Riferimento alla skill                             |
| `path`     | text      | Path relativo (es. `references/guide.md`)          |
| `kind`     | enum      | `"reference"` / `"script"` / `"asset"` / `"other"` |
| `content`  | text      | Contenuto file UTF-8                               |

Unique constraint su `(skill_id, path)`.

### `skill_link`

| Colonna              | Tipo      | Note                           |
| -------------------- | --------- | ------------------------------ |
| `id`                 | uuid (PK) | Generato automaticamente       |
| `source_skill_id`    | uuid (FK) | Skill che contiene la mention  |
| `target_skill_id`    | uuid (FK) | Skill referenziata (o NULL)    |
| `target_resource_id` | uuid (FK) | Risorsa referenziata (o NULL)  |
| `kind`               | text      | `"mention"` per auto-generated |
| `metadata`           | jsonb     | `{ origin: "markdown-auto" }`  |

Check constraint: esattamente uno tra `target_skill_id` e `target_resource_id` deve essere non-NULL.

---

## Esecuzione completa della pipeline

```bash
# Prerequisiti
cd omniscient
bun install  # assicurarsi che gray-matter e @neondatabase/serverless siano installati

# Step 1: Ingest skill + risorse + cross-ref skill-to-skill
DATABASE_URL="..." bun run scraping_algorythm/ingest-skills.ts --dir ./parsed-skills -v

# Step 2: Importa risorse mancanti (se necessario)
DATABASE_URL="..." bun run scraping_algorythm/import-missing-resources.ts --dir ./parsed-skills -v

# Step 3: Risolvi riferimenti a risorse nel markdown
DATABASE_URL="..." bun run scraping_algorythm/resolve-resource-refs.ts -v

# Step 4: Genera grafo di link
DATABASE_URL="..." bun run scraping_algorythm/sync-all-links.ts -v
```

## Verifica

```sql
-- Skill con resource mentions risolte
SELECT COUNT(*) FROM skill WHERE skill_markdown LIKE '%[[resource:%';

-- Skill con riferimenti testuali NON risolti (dovrebbe essere 0)
SELECT slug FROM skill WHERE skill_markdown LIKE '%](references/%';

-- Totale link auto-generati
SELECT COUNT(*) FROM skill_link WHERE metadata->>'origin' = 'markdown-auto';

-- Breakdown link per tipo
SELECT
  CASE WHEN target_skill_id IS NOT NULL THEN 'skill' ELSE 'resource' END as type,
  COUNT(*)
FROM skill_link
WHERE metadata->>'origin' = 'markdown-auto'
GROUP BY 1;
```

## Risultati ultima esecuzione (Feb 2026)

| Metrica                     | Valore                  |
| --------------------------- | ----------------------- |
| Skill importate             | 149                     |
| Risorse importate           | 1363                    |
| Riferimenti risorse risolti | 578                     |
| Cross-ref skill risolti     | 36 skill                |
| Link auto-generati          | 759                     |
| — skill-to-skill            | 115                     |
| — skill-to-resource         | 644                     |
| Riferimenti irrisolti       | 17 (placeholder/esempi) |

## Dipendenze

- **Runtime**: [Bun](https://bun.sh/)
- **DB**: PostgreSQL su [Neon](https://neon.tech/) via `@neondatabase/serverless`
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (`drizzle-orm/neon-http`)
- **YAML**: `gray-matter` per il parsing frontmatter
- **Node built-in**: `fs/promises`, `path`, `util.parseArgs`
