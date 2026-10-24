// Abrir una lección existente: una carpeta "<Set> Lessons" (o la del proyecto que la
// contiene), elegida o arrastrada, o un .zip. Todo se lee en el navegador; nada se sube.
//
// Las carpetas se recorren de a poco y solo por nombre: se baja hasta 2 niveles y se
// cuentan las entradas, así elegir el Escritorio por error avisa enseguida en lugar de
// leer miles de archivos. Solo se lee el contenido de las carpetas de lección.

const LESSON_FILE = /^Lessons[A-Z]{2}(_Mac|_Pc)?\.txt$/;
const IGNORED = /^(\.DS_Store|Thumbs\.db|__MACOSX)$/;
const MAX_DEPTH = 2;
const MAX_ENTRIES = 3000;

export interface OpenedFolder {
  /** Nombre del set, si la carpeta se llama "<Set> Lessons". */
  setName: string;
  /** Ruta de la carpeta de la lección dentro de lo que se abrió ("" si es la raíz). */
  path: string;
  /** Archivos por ruta relativa a la carpeta de la lección. */
  files: Map<string, Uint8Array>;
}

/** Resultado de buscar lecciones: las encontradas, o "demasiado grande" si se cortó antes. */
export type ScanResult = OpenedFolder[] | 'too-many';

/** Una carpeta que se puede listar de a un nivel, venga de donde venga. */
export interface Dir {
  name: string;
  list(): Promise<(Dir | FileRef)[]>;
}
export interface FileRef {
  name: string;
  read(): Promise<Uint8Array>;
}
const isDir = (n: Dir | FileRef): n is Dir => 'list' in n;

function setNameOf(folderName: string): string {
  return / Lessons$/.test(folderName) ? folderName.replace(/ Lessons$/, '') : '';
}

async function readAll(dir: Dir, prefix: string, out: Map<string, Uint8Array>, depth: number) {
  for (const n of await dir.list()) {
    if (IGNORED.test(n.name)) continue;
    if (isDir(n)) {
      if (depth < 2) await readAll(n, `${prefix}${n.name}/`, out, depth + 1); // Large/
    } else {
      out.set(prefix + n.name, await n.read());
    }
  }
}

/** Busca carpetas de lección hasta 2 niveles por debajo de `root`. */
export async function scanLessons(root: Dir, limits = { depth: MAX_DEPTH, entries: MAX_ENTRIES }): Promise<ScanResult> {
  const found: OpenedFolder[] = [];
  const queue: { dir: Dir; path: string; depth: number }[] = [{ dir: root, path: '', depth: 0 }];
  let seen = 0;
  while (queue.length) {
    const { dir, path, depth } = queue.shift()!;
    const entries = (await dir.list()).filter((n) => !IGNORED.test(n.name) && !n.name.startsWith('.'));
    seen += entries.length;
    if (seen > limits.entries && !found.length) return 'too-many';
    if (entries.some((n) => !isDir(n) && LESSON_FILE.test(n.name))) {
      const files = new Map<string, Uint8Array>();
      await readAll(dir, '', files, 0);
      found.push({ setName: setNameOf(dir.name), path, files });
      continue; // No se busca más adentro de una lección.
    }
    if (depth < limits.depth) {
      // Primero las carpetas que más prometen ("… Lessons", "… Project"), así un Escritorio
      // con muchas carpetas encuentra la lección antes de llegar al tope de entradas.
      const rank = (n: string) => (/ Lessons$/.test(n) ? 0 : / Project$/.test(n) ? 1 : 2);
      const subdirs = entries.filter(isDir).sort((a, b) => rank(a.name) - rank(b.name));
      const next = subdirs.map((n) => ({ dir: n, path: path ? `${path}/${n.name}` : n.name, depth: depth + 1 }));
      const firstOther = queue.findIndex((q) => rank(q.dir.name) === 2);
      for (const item of next) {
        if (rank(item.dir.name) < 2 && firstOther >= 0) queue.splice(firstOther, 0, item);
        else queue.push(item);
      }
    }
  }
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

// --- Cada origen como Dir ------------------------------------------------------------

/** Chrome y Edge: carpeta elegida con showDirectoryPicker (sin cartel de "subir"). */
export function dirFromHandle(handle: FileSystemDirectoryHandle): Dir {
  return {
    name: handle.name,
    async list() {
      const out: (Dir | FileRef)[] = [];
      for await (const [name, child] of handle.entries() as AsyncIterable<[string, FileSystemHandle]>) {
        out.push(
          child.kind === 'directory'
            ? dirFromHandle(child as FileSystemDirectoryHandle)
            : { name, read: async () => new Uint8Array(await (await (child as FileSystemFileHandle).getFile()).arrayBuffer()) },
        );
      }
      return out;
    },
  };
}

/** Lo que se arrastra: entradas de carpeta o de archivo (webkitGetAsEntry). */
export function dirFromEntry(entry: FileSystemDirectoryEntry): Dir {
  return {
    name: entry.name,
    list: () =>
      new Promise((resolve, reject) => {
        const reader = entry.createReader();
        const out: (Dir | FileRef)[] = [];
        const batch = () =>
          reader.readEntries((entries) => {
            if (!entries.length) return resolve(out);
            for (const e of entries) out.push(e.isDirectory ? dirFromEntry(e as FileSystemDirectoryEntry) : fileFromEntry(e as FileSystemFileEntry));
            batch();
          }, reject);
        batch();
      }),
  };
}

function fileFromEntry(entry: FileSystemFileEntry): FileRef {
  return {
    name: entry.name,
    read: () =>
      new Promise((resolve, reject) =>
        entry.file(async (f) => resolve(new Uint8Array(await f.arrayBuffer())), reject),
      ),
  };
}

/** Arma un Dir a partir de rutas ya conocidas (con "/"), sin leer nada hasta que haga falta. */
function treeDir(items: { path: string; read: () => Promise<Uint8Array> }[]): Dir {
  type Node = { dirs: Map<string, Node>; files: Map<string, () => Promise<Uint8Array>> };
  const root: Node = { dirs: new Map(), files: new Map() };
  for (const { path, read } of items) {
    const parts = path.split('/');
    let node = root;
    for (const part of parts.slice(0, -1)) {
      if (!node.dirs.has(part)) node.dirs.set(part, { dirs: new Map(), files: new Map() });
      node = node.dirs.get(part)!;
    }
    node.files.set(parts[parts.length - 1]!, read);
  }
  const toDir = (name: string, node: Node): Dir => ({
    name,
    list: async () => [
      ...[...node.dirs].map(([n, child]) => toDir(n, child)),
      ...[...node.files].map(([n, read]) => ({ name: n, read })),
    ],
  });
  // Si todo cuelga de una sola carpeta (la elegida, o la de adentro del zip), esa es la raíz.
  if (root.files.size === 0 && root.dirs.size === 1) {
    const [name, only] = [...root.dirs][0]!;
    return toDir(name, only);
  }
  return toDir('', root);
}

/**
 * Safari y Firefox: carpeta elegida con <input webkitdirectory>. El navegador ya listó todo,
 * pero acá solo se miran los nombres (webkitRelativePath); el contenido se lee al final.
 */
export function dirFromFileList(files: File[]): Dir {
  return treeDir(files.map((f) => ({ path: f.webkitRelativePath || f.name, read: async () => new Uint8Array(await f.arrayBuffer()) })));
}

// --- Zip ----------------------------------------------------------------------------

export async function readZip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(bytes);
  const out = new Map<string, Uint8Array>();
  for (const entry of Object.values(zip.files)) {
    if (!entry.dir) out.set(entry.name, await entry.async('uint8array'));
  }
  return out;
}

/** Un zip ya está en memoria: se arma un Dir con sus rutas y se busca igual que en una carpeta. */
export function dirFromMap(all: Map<string, Uint8Array>): Dir {
  return treeDir([...all].map(([path, data]) => ({ path, read: async () => data })));
}
