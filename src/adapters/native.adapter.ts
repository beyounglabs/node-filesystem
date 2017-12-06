import { ListContentsResponse } from '../response/list.contents.response';
import { readdir, readFile, writeFile, stat, mkdir, unlink } from 'fs';
import { promisify } from 'util';
import { AbstractAdapter } from './abstract.adapter';
import { AdapterInterface } from '../adapter.interface';

const readdirAsync = promisify(readdir);
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);
const mkdirAsync = promisify(mkdir);
const unlinkAsync = promisify(unlink);

export class NativeAdapter extends AbstractAdapter implements AdapterInterface {
  protected permissions: any = {
    file: {
      public: '0644',
      private: '0600',
    },
    dir: {
      public: '0755',
      private: '0700',
    },
  };

  constructor(
    root: string,
    writeFlags?: string,
    linkHandling?: number,
    permissions: any[] = [],
  ) {
    super();

    if (permissions) {
      this.permissions = permissions;
    }

    this.setPathPrefix(root);
  }

  public async listContents(
    directory: string,
    recursive: boolean = false,
  ): Promise<ListContentsResponse[]> {
    const location = this.applyPathPrefix(directory);
    const files = await readdirAsync(location, 'utf8');
    const response: ListContentsResponse[] = [];
    files.forEach(file => {
      // const isFile = fs.lstatSync(`${filesPath}${file}`).isFile();
      const isFile = true;
      const listContentResponse = new ListContentsResponse();
      listContentResponse.type = isFile ? 'file' : 'dir';
      listContentResponse.path = file;
      response.push(listContentResponse);
    });

    return response;
  }

  public async write(path: string, contents: string): Promise<any> {
    const location = this.applyPathPrefix(path);

    const pathList = location.split('/');
    pathList.splice(-1, 1);

    const folder = pathList.join('/');

    if (!await this.dirExists(folder)) {
      await this.mkdir(folder);
    }

    await writeFileAsync(location, contents);

    return {
      contents,
      type: 'file',
      size: 0,
      path,
      visibility: 'public', // @todo change this`
    };
  }

  public async read(path: string): Promise<any> {
    const location = this.applyPathPrefix(path);
    const contents = await readFileAsync(location, 'utf8');
    return {
      type: 'file',
      path,
      contents,
    };
  }

  public async delete(path: string): Promise<boolean> {
    const location = this.applyPathPrefix(path);
    await unlinkAsync(location);
    return true;
  }

  public async has(path: string): Promise<boolean> {
    throw new Error('Not implemented yet');
  }

  public async readStream(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getMetadata(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getSize(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getMimetype(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getTimestamp(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getVisibility(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async writeStream(
    path: string,
    resource: any,
    config?: any,
  ): Promise<any> {
    throw new Error('Not implemented yet');
  }

  public async update(
    path: string,
    contents: string,
    config?: any,
  ): Promise<any> {
    throw new Error('Not implemented yet');
  }

  public async updateStream(
    path: string,
    resource: any,
    config?: any,
  ): Promise<any> {
    throw new Error('Not implemented yet');
  }

  public async rename(path: string, newPath: string): Promise<boolean> {
    throw new Error('Not implemented yet');
  }

  public async copy(path: string, newPath: string): Promise<boolean> {
    throw new Error('Not implemented yet');
  }

  public async deleteDir(path: string): Promise<boolean> {
    throw new Error('Not implemented yet');
  }

  public async createDir(path: string): Promise<boolean> {
    throw new Error('Not implemented yet');
  }

  public async setVisibility(
    path: string,
    visibility: 'public' | 'private',
  ): Promise<any> {
    throw new Error('Not implemented yet');
  }

  protected async dirExists(path: string): Promise<boolean> {
    try {
      await statAsync(path);
      return true;
    } catch (e) {
      return false;
    }
  }

  protected async mkdir(path: string): Promise<void> {
    await mkdirAsync(path);
  }
}
