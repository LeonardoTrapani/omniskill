# Task: Sostituire riferimenti testuali con [[resource:uuid]] in tutti gli SKILL.md

## Obiettivo

Per ogni skill in `parsed-skills/` che ha risorse nel `resources-map.json`, sostituisci manualmente i riferimenti testuali a file con `[[resource:<uuid>]]`.

## Risorse Disponibili

- `resources-map.json` contiene la mappa: slug → [(path → uuid)]
- Ci sono 72 skill con risorse da processare

## Flusso per ogni skill:

1. **Identifica lo skill successivo** con risorse da processare
2. **Leggi il file** `parsed-skills/<slug>/SKILL.md`
3. **Cerca e sostituisci** questi pattern:
   - `[testo](references/file.md)` → `[[resource:uuid]]`
   - `[testo](./references/file.md)` → `[[resource:uuid]]`
   - `→ references/file.md` → `→ [[resource:uuid]]`
   - `` `references/file.md` `` → `[[resource:uuid]]`
   - `**references/file.md**` → `[[resource:uuid]]`
   - `**references/file.md**: descrizione` → `[[resource:uuid]]: descrizione`
   - Testo piano: "See references/file.md" → "See [[resource:uuid]]"
   - Dentro tabelle: `references/file.md` → `[[resource:uuid]]`
   - Con anchor: `references/file.md#sezione` → `[[resource:uuid]]` (ignora #sezione)
   - Stesso per `scripts/` e `assets/`

4. **Normalizzazione path**:
   - Rimuovi `./` iniziale: `./references/file.md` → cerca `references/file.md`
   - Rimuovi anchor `#...`: `references/file.md#sezione` → cerca `references/file.md`
   - Il path risultante deve matchare ESATTAMENTE il campo `path` in `resources-map.json`

5. **NON toccare**:
   - `[[skill:...]]` (già cross-ref a skill, già risolti)
   - URL esterni (`https://...`)
   - Path che non iniziano con `references/`, `scripts/`, o `assets/`
   - Il frontmatter YAML tra `---`

6. **Se il path non ha match** nella mappa UUID→path, **LASCIALO com'è** (non inventare UUID)

7. **Salva il file** dopo le modifiche

## Stato Attuale

- ✅ 29 skill sono stati già processati con uno script
- ⏳ 43 skill rimangono da verificare/processare

## Obbiettivo Finale

Quando tutti i 72 skill sono stati processati, stampa:

```
<promise>TUTTI GLI SKILL PROCESSATI</promise>
```

Questo uscirà dal loop.
