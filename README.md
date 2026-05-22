# bulette

Monorepo with:

- Chrome extension (LLM chat/control surface): `apps/chrome-extension`
- Owlbear Rodeo extension (OBR SDK executor + bridge): `apps/owlbear-extension`
- Shared TypeScript DSL/validation/messaging modules: `packages/shared`

## Setup

```bash
npm install
```

## Dev mode

```bash
npm run dev -w @bulette/owlbear-extension
npm run dev -w @bulette/chrome-extension
```

## Build

```bash
npm run build
```

Outputs:

- Chrome extension: `dist/chrome-extension`
- Owlbear extension: `dist/owlbear-extension`

## Deploy GitHub Pages

Workflow: `.github/workflows/deploy-pages.yml`.
It deploys `dist/owlbear-extension` to GitHub Pages.

## Install Chrome extension (unpacked)

1. Build the repo.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Load unpacked and select `dist/chrome-extension`.

## Install Owlbear extension manifest

After Pages deploy, host this URL:

`https://OWNER.github.io/REPO/manifest.json`

`apps/owlbear-extension/public/manifest.json` contains OWNER/REPO placeholders.

## Configure API key

Use the Chrome extension options page and set:

- API key
- Provider base URL
- Default model

Stored in `chrome.storage.local`; no backend is used.

## Example prompt

> Move the owlbear toward the nearest wounded hero and preview its target.

## Example generated DSL

```json
{
  "version": "obr-dsl/v1",
  "sagaId": "example-saga",
  "mode": "preview",
  "actor": { "role": "GM" },
  "safety": {
    "requireGmForWrites": true,
    "requireConfirmation": true,
    "allowNetworkBroadcast": false,
    "allowAssetPicker": false,
    "allowSceneUpload": false,
    "allowViewportControl": false,
    "maxItemsAffected": 1
  },
  "steps": [
    {
      "id": "move-owlbear",
      "operation": "OBR.scene.items.updateItems",
      "effect": "write",
      "args": {
        "itemIds": ["item-owlbear-id"],
        "patch": { "position": { "x": 1200, "y": 950 } }
      }
    }
  ]
}
```

## Security model

- LLM output is JSON-only and validated with zod.
- Unknown operations are rejected.
- No `eval`, no arbitrary JS execution.
- GM required for writes when safety policy requires it.
- Broadcast/asset/scene-upload/room-metadata/viewport writes are denied unless safety policy allows.
- Item IDs are validated before writes.
- `maxItemsAffected` is enforced.
- Supports dry-run (`read`/`plan`) and preview (`scene.local`) before apply.
- Metadata patching is restricted to extension namespace and blocks prototype-pollution keys.

## Limitations

- Extension bridge uses `postMessage` and same-page integration constraints.
- Tactical mutation compilation is intentionally conservative.
- Some OBR operations are intentionally unsupported and return explicit `unsupportedOperation` errors.
