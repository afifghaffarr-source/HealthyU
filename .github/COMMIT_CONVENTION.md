# Commit Convention — HealthyU

Gunakan prefix berikut untuk semua commit message.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

## Types

| Prefix     | Kapan dipakai                    | Contoh                                           |
| ---------- | -------------------------------- | ------------------------------------------------ |
| `feat`     | Fitur baru                       | `feat(scan): tambah barcode scanner`             |
| `fix`      | Bug fix                          | `fix(auth): perbaiki redirect loop`              |
| `security` | Perbaikan keamanan               | `security(rate-limit): ubah default fail-closed` |
| `privacy`  | Perubahan terkait privasi        | `privacy(profile): strip sensitive fields`       |
| `refactor` | Refactor tanpa mengubah behavior | `refactor(scan): consolidate batch files`        |
| `test`     | Tambah/update test               | `test(e2e): tambah security header tests`        |
| `docs`     | Dokumentasi                      | `docs: tambah commit convention`                 |
| `style`    | Formatting, whitespace           | `style: fix prettier formatting`                 |
| `chore`    | Maintenance tasks                | `chore: update dependencies`                     |
| `perf`     | Performance improvement          | `perf(dashboard): lazy load secondary cards`     |
| `ci`       | CI/CD changes                    | `ci: tambah lighthouse workflow`                 |
| `build`    | Build system changes             | `build: optimalkan bundle size`                  |
| `revert`   | Revert commit sebelumnya         | `revert: undo scan consolidation`                |

## Scope (opsional)

Scope menunjukkan area yang berubah:

- `scan`, `chat`, `coach`, `ai`, `auth`, `dashboard`, `profile`, `privacy`
- `food`, `water`, `fasting`, `mood`, `vitals`, `workout`, `sleep`
- `groups`, `social`, `community`, `challenges`
- `notifications`, `push`, `pwa`
- `db`, `rls`, `migration`
- `e2e`, `test`, `lint`

## Contoh

```
feat(scan): tambah fitur scan resep dari foto
fix(dashboard): perbaiki card overflow di mobile
security(moderation): ubah image moderation ke fail-closed
privacy(profile): tambah field whitelist untuk public profile
test(e2e): tambah test untuk security headers dan PWA manifest
refactor(offline-queue): tambah TTL dan clearAll untuk logout
ci: tambah coverage artifact upload
```

## Rules

1. Gunakan bahasa Indonesia untuk description
2. Gunakan imperative mood ("tambah" bukan "menambah")
3. Max 72 karakter untuk subject line
4. Jangan gunakan period di akhir subject
5. Body (opsional) jelaskan WHY, bukan WHAT
