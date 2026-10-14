type MockFileRecord = {
  exists: boolean;
  modificationTime: number | null;
  creationTime: number | null;
};

type DirectoryFault = 'missing' | 'exists-throws' | 'list-throws';

const files = new Map<string, MockFileRecord>();
const deletedUris: string[] = [];
const directoryFaults = new Map<string, DirectoryFault>();
const deleteFailures = new Set<string>();

export function resetMockFiles(): void {
  files.clear();
  deletedUris.length = 0;
  directoryFaults.clear();
  deleteFailures.clear();
}

export function setMockFileExists(uri: string, exists: boolean): void {
  const current = files.get(uri);
  files.set(uri, {
    exists,
    modificationTime: current?.modificationTime ?? null,
    creationTime: current?.creationTime ?? null,
  });
}

export function setMockFileTimes(
  uri: string,
  times: { modificationTime?: number | null; creationTime?: number | null },
): void {
  const current = files.get(uri) ?? {
    exists: true,
    modificationTime: null,
    creationTime: null,
  };
  files.set(uri, {
    exists: current.exists,
    modificationTime:
      times.modificationTime === undefined ? current.modificationTime : times.modificationTime,
    creationTime: times.creationTime === undefined ? current.creationTime : times.creationTime,
  });
}

export function setMockDirectoryFault(uri: string, fault: DirectoryFault): void {
  directoryFaults.set(uri, fault);
}

export function setMockDeleteThrows(uri: string): void {
  deleteFailures.add(uri);
}

export function mockDeletedFileUris(): string[] {
  return [...deletedUris];
}

function uriFromParts(parts: unknown[]): string {
  return parts
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }
      if (part && typeof part === 'object' && 'uri' in part && typeof part.uri === 'string') {
        return part.uri;
      }
      return String(part);
    })
    .join('/');
}

export class Directory {
  uri: string;

  constructor(...parts: unknown[]) {
    this.uri = uriFromParts(parts);
  }

  get exists(): boolean {
    const fault = directoryFaults.get(this.uri);
    if (fault === 'exists-throws') {
      throw new Error('unreadable directory');
    }
    return fault !== 'missing';
  }

  create(): void {
    directoryFaults.delete(this.uri);
  }

  list(): File[] {
    const fault = directoryFaults.get(this.uri);
    if (fault === 'list-throws' || fault === 'exists-throws') {
      throw new Error('unreadable directory');
    }
    if (fault === 'missing') {
      throw new Error('missing directory');
    }
    const prefix = this.uri.endsWith('/') ? this.uri : `${this.uri}/`;
    const children: File[] = [];
    for (const [uri, record] of files) {
      if (!record.exists || !uri.startsWith(prefix)) {
        continue;
      }
      const remainder = uri.slice(prefix.length);
      if (!remainder || remainder.includes('/')) {
        continue;
      }
      children.push(new File(uri));
    }
    return children;
  }
}

export class File {
  uri: string;

  constructor(...parts: unknown[]) {
    this.uri = uriFromParts(parts);
  }

  get name(): string {
    const index = this.uri.lastIndexOf('/');
    return index >= 0 ? this.uri.slice(index + 1) : this.uri;
  }

  get exists(): boolean {
    return files.get(this.uri)?.exists ?? false;
  }

  get modificationTime(): number | null {
    return files.get(this.uri)?.modificationTime ?? null;
  }

  get creationTime(): number | null {
    return files.get(this.uri)?.creationTime ?? null;
  }

  get lastModified(): number | null {
    return this.modificationTime;
  }

  delete(): void {
    if (deleteFailures.has(this.uri)) {
      throw new Error('delete failed');
    }
    deletedUris.push(this.uri);
    const current = files.get(this.uri);
    files.set(this.uri, {
      exists: false,
      modificationTime: current?.modificationTime ?? null,
      creationTime: current?.creationTime ?? null,
    });
  }

  async copy(): Promise<void> {
    const current = files.get(this.uri);
    files.set(this.uri, {
      exists: true,
      modificationTime: current?.modificationTime ?? null,
      creationTime: current?.creationTime ?? null,
    });
  }

  create(): void {
    const current = files.get(this.uri);
    files.set(this.uri, {
      exists: true,
      modificationTime: current?.modificationTime ?? null,
      creationTime: current?.creationTime ?? null,
    });
  }

  write(): void {
    this.create();
  }

  async base64(): Promise<string> {
    return '';
  }
}

export class Paths {
  static get document(): Directory {
    return new Directory('file:///documents');
  }
}
