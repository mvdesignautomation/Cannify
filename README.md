# Cannify

Cannify is a local, offline-first food inventory and preservation app. It keeps food items, independent batches, quantities, dates, consumption, discards, item-level QR codes, history, and Recently Deleted on the device that is using it.

There is no account, no cloud, no backend, no AI, and no subscription. Core features work with the network turned off.

## What it does

- Track food items with a name, optional category, image, and note
- Keep multiple independent batches per item
- Store original, good, and discarded quantities separately
- Consume good quantity using FIFO (oldest applicable batch first)
- Discard food in part or in full, with a required reason
- Show an item-level QR code for consume / add-batch shortcuts
- Record Added, Consumed, Discarded, and Restored events
- Restore or permanently delete records from Recently Deleted

## Platform

This implementation is an installable web app designed for phones and tablets. All application data stays in the browser’s IndexedDB on that device.

The original product specification targets Flutter + SQLite/Drift for Android. This repository is the working local app with that product behavior, using a repository/service layer over a structured local database so the same rules can be ported to Flutter/Drift later without changing how Cannify works.

## Technology

- React 19
- TanStack Start / Router / Query
- Tailwind CSS
- IndexedDB (local structured storage)
- Zustand-free service layer with TanStack Query for reactive UI
- `qrcode` for item QR generation
- Browser `BarcodeDetector` for scanning

State management: **TanStack Query** talks to local repository functions. Mutations invalidate a shared `cannify` query key so inventory, history, and deleted views stay consistent. Business rules (FIFO, discard, restore) live in services, not widgets.

## Local data model

```
food items 1 ── * batches
     │
     └── history events (added / consumed / discarded / restored)
```

- Deleting an item or batch is a soft delete (`status: deleted`) and appears in Recently Deleted.
- Consume and discard never delete records. They change good/bad quantities and write history.
- Original quantity is not overwritten by consume or discard.

## Develop

```sh
npm install
npm run dev
```

```sh
npm test
npm run typecheck
npm run build
```

Application logic tests for FIFO consumption and discard math live in `src/lib/cannify/fifo.test.ts`.

## Project structure

```
src/lib/cannify/     schema, IndexedDB, repositories/services, FIFO rules
src/components/      UI primitives and Cannify feature components
src/routes/          Home, Inventory, Consume, History, Recently Deleted, Scan
```

## License

License choice is for the project owner to decide. This repository does not invent a license.
