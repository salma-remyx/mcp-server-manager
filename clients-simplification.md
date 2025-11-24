# Simplificação de Clients (Estilo Docker)

## Nova Lógica - 3 Estados

| Status            | Ícone       | Significado                              |
| ----------------- | ----------- | ---------------------------------------- |
| **Connected**     | ✔ (verde)  | Nossos servers estão no config do client |
| **Disconnected**  | ○ (amarelo) | Client instalado, mas sem nossos servers |
| **Not installed** | ✗ (cinza)   | Client não encontrado no sistema         |

---

## Arquivos a Modificar

### 1. `src/types/client.types.ts`

- Remover campos `enabled`, `synced` de `DetectedClient`
- Adicionar `status: "connected" | "disconnected" | "not-installed"`
- Remover interfaces `ClientsState`, `SyncResult`, `ClientSyncResult`

### 2. `src/services/client.service.ts`

- **Remover:** `loadState()`, `saveState()`, `enableClient()`, `disableClient()`, `getEnabledClients()`, `syncToAllClients()`
- **Renomear:** `syncToClient()` → `connectClient()`
- **Adicionar:** `disconnectClient()`, `getConnectionStatus()`
- Simplificar `detectClients()` para usar novo modelo

### 3. `src/cli/commands/client.cmd.ts`

- **Remover comandos:** `sync`, `enable`, `disable`
- **Adicionar comandos:** `connect <client>`, `disconnect <client>`
- Atualizar `list` para mostrar os 3 estados

### 4. `src/tui/screens/ClientsScreen.tsx`

- **Remover:** tecla Space (toggle sync), tecla S (sync all)
- **Enter** = Connect/Disconnect (toggle baseado no status atual)
- Simplificar UI para mostrar apenas os 3 estados

### 5. Testes

- Atualizar para refletir nova API

### 6. `src/shared/features.ts`

- Atualizar features registry

---

## Comandos CLI (Novos) - remove old commands if needed and update docs

```bash
mcpsm clients                 # Lista com status
mcpsm clients connect <id>    # Escreve servers no client
mcpsm clients disconnect <id> # Remove servers do client
mcpsm clients open <id>       # Abre config (mantém)
```

---

## TUI Keybindings (Novos)

```
↑/↓     Navegar
Enter   Connect/Disconnect (toggle)
Q       Voltar
```

---

## O que será removido

- Arquivo `~/.mcp-manager/clients.json` (não mais necessário)
- ~150+ linhas de código relacionado a sync/enable/disable
