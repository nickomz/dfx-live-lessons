// Abrir una lección existente: una carpeta "<Set> Lessons" arrastrada o elegida, o un .zip.
// Todo se lee en el navegador; nada se sube.

const LESSON_FILE = /(^|\/)Lessons[A-Z]{2}(_Mac|_Pc)?\.txt$/;
const IGNORED = /(^|\/)(\.DS_Store|__MACOSX\/.*|Thumbs\.db)$/;

export interface OpenedFolder {
  /** Nombre del set, si la carpeta se llama "<Set> Lessons". */
  setName: string;
  /** Ruta de la carpeta de la lección dentro de lo que se abrió ("" si estaba en la raíz). */
  path: string;
  /** Archivos por ruta relativa a la carpeta de la lección. */
  files: Map<string, Uint8Array>;
}

/**
 * Busca las carpetas de lección dentro de un conjunto de archivos (rutas con "/"): la
 * carpeta "<Set> Lessons" misma, su .zip o la carpeta del proyecto que las contiene.
 */
export function findLessonFolders(all: Map<string, Uint8Array>): OpenedFolder[] {
  const dirs = new Set<string>();
  for (const p of all.keys()) {
    if (!IGNORED.test(p) && LESSON_FILE.test(p)) dirs.add(p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');
  }
  return [...dirs].sort().map((dir) => {
    const files = new Map<string, Uint8Array>();
    for (const [path, data] of all) {
      if (path.startsWith(dir) && !IGNORED.test(path)) files.set(path.slice(dir.length), data);
    }
    const folderName = dir.replace(/\/$/, '').split('/').pop() ?? '';
    const setName = / Lessons$/.test(folderName) ? folderName.replace(/ Lessons$/, '') : '';
    return { setName, path: dir.replace(/\/$/, ''), files };
  });
}

export async function readZip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(bytes);
  const out = new Map<string, Uint8Array>();
  for (const entry of Object.values(zip.files)) {
    if (!entry.dir) out.set(entry.name, await entry.async('uint8array'));
  }
  return out;
}

async function readFile(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** Archivos elegidos con un <input>: un .zip, o una carpeta (webkitdirectory). */
export async function readPickedFiles(list: FileList): Promise<Map<string, Uint8Array>> {
  const files = [...list];
  if (files.length === 1 && /\.zip$/i.test(files[0]!.name)) return readZip(await readFile(files[0]!));
  const out = new Map<string, Uint8Array>();
  for (const f of files) out.set(f.webkitRelativePath || f.name, await readFile(f));
  return out;
}

function entryFiles(entry: FileSystemEntry, prefix: string, out: Map<string, Uint8Array>): Promise<void> {
  if (entry.isFile) {
    return new Promise((resolve, reject) =>
      (entry as FileSystemFileEntry).file(async (f) => {
        out.set(prefix + entry.name, await readFile(f));
        resolve();
      }, reject),
    );
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  return new Promise((resolve, reject) => {
    const batch = () =>
      reader.readEntries(async (entries) => {
        if (!entries.length) return resolve();
        await Promise.all(entries.map((e) => entryFiles(e, `${prefix}${entry.name}/`, out)));
        batch();
      }, reject);
    batch();
  });
}

/** Lo que se suelta sobre la ventana: una carpeta, un .zip o archivos sueltos. */
export async function readDropped(data: DataTransfer): Promise<Map<string, Uint8Array>> {
  const entries = [...data.items].map((i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e);
  if (entries.length === 1 && entries[0]!.isFile && /\.zip$/i.test(entries[0]!.name)) {
    return readZip(await readFile(data.files[0]!));
  }
  const out = new Map<string, Uint8Array>();
  await Promise.all(entries.map((e) => entryFiles(e, '', out)));
  return out;
}
