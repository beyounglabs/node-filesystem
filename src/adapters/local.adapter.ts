import * as Bluebird from 'bluebird';
import {
  copy,
  mkdirs,
  move,
  readdir,
  readFile,
  remove,
  stat,
  unlink,
  writeFile,
} from 'fs-extra';
import * as recursiveReaddir from 'recursive-readdir';

import { AdapterInterface } from '../adapter.interface';
import { ListContentsResponse } from '../response/list.contents.response';
import { AbstractAdapter } from './abstract.adapter';

const recursiveReaddirAsync: any = Bluebird.promisify(recursiveReaddir);

export class LocalAdapter extends AbstractAdapter implements AdapterInterface {
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

    if (!await this.isDir(location)!) {
      return [];
    }

    /**
     * @todo implements recursive
     */

    const files = await readdir(location, 'utf8');
    const response: ListContentsResponse[] = [];

    for (const file of files) {
      const fileStat = await stat(location + file);
      const isFile = fileStat.isFile();
      const listContentResponse = new ListContentsResponse();
      listContentResponse.type = isFile ? 'file' : 'dir';
      listContentResponse.path = file;
      listContentResponse.size = fileStat.size;
      listContentResponse.timestamp = Math.round(fileStat.mtimeMs / 1000);

      response.push(listContentResponse);
    }

    return response;
  }

  public async write(
    path: string,
    contents: string,
    config?: any,
  ): Promise<any> {
    const location = this.applyPathPrefix(path);

    await this.ensureDirectory(this.getDirname(path));
    await writeFile(location, contents);

    /**
     * @todo implements visibility
     * @todo implements permission
     */
    return {
      contents,
      type: 'file',
      size: Buffer.byteLength(contents),
      path,
      visibility: 'public',
    };
  }

  public async read(path: string): Promise<any | false> {
    const location = this.applyPathPrefix(path);
    let contents = '';
    try {
      contents = await readFile(location, 'utf8');
    } catch (e) {
      return false;
    }
    return {
      type: 'file',
      path,
      contents,
    };
  }

  public async delete(path: string): Promise<boolean> {
    const location = this.applyPathPrefix(path);
    try {
      await unlink(location);
    } catch (e) {
      return false;
    }
    return true;
  }

  public async has(path: string): Promise<boolean> {
    const location = this.applyPathPrefix(path);
    try {
      const statDir = await stat(location);
    } catch (e) {
      return false;
    }

    return true;
  }

  public async readStream(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getMetadata(path: string): Promise<any> {
    const location: string = this.applyPathPrefix(path);
    const fileStat = await stat(location);
    const timestamp = Math.round(fileStat.mtimeMs / 1000);
    if (fileStat.isFile()) {
      return { type: 'file', path, timestamp, size: fileStat.size };
    }

    if (fileStat.isDirectory()) {
      return { type: 'dir', path, timestamp };
    }
  }

  public async getSize(path: string): Promise<any> {
    return await this.getMetadata(path);
  }

  public async getMimetype(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getTimestamp(path: string): Promise<any> {
    return await this.getMetadata(path);
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
    return await this.write(path, contents, config);
  }

  public async updateStream(
    path: string,
    resource: any,
    config?: any,
  ): Promise<any> {
    throw new Error('Not implemented yet');
  }

  public async rename(path: string, newpath: string): Promise<boolean> {
    const location: string = this.applyPathPrefix(path);
    const destination: string = this.applyPathPrefix(newpath);

    try {
      await move(location, destination);
    } catch (e) {
      return false;
    }
    return true;
  }

  public async copy(path: string, newpath: string): Promise<boolean> {
    const location: string = this.applyPathPrefix(path);
    const destination: string = this.applyPathPrefix(newpath);

    try {
      await copy(location, destination);
    } catch (e) {
      return false;
    }
    return true;
  }

  public async deleteDir(path: string): Promise<boolean> {
    const location: string = this.applyPathPrefix(path);
    if (!await this.isDir(location)) {
      return false;
    }

    try {
      await remove(location);
    } catch (e) {
      return false;
    }

    return true;
  }

  public async createDir(dirname: string): Promise<any | false> {
    const location: string = this.applyPathPrefix(dirname);
    /**
     * @todo implements umask
     * @todo implements visibility
     */
    try {
      await mkdirs(location);
    } catch (e) {
      return false;
    }

    return { path: dirname, type: 'dir' };
  }

  public async setVisibility(
    path: string,
    visibility: 'public' | 'private',
  ): Promise<any> {
    throw new Error('Not implemented yet');
  }

  protected async isDir(root: string): Promise<boolean> {
    try {
      const statDir = await stat(root);
      return statDir.isDirectory();
    } catch (e) {
      return false;
    }
  }

  protected getDirname(path: string): string {
    const pathList = path.split('/');
    pathList.splice(-1, 1);
    return pathList.join('/');
  }

  protected async ensureDirectory(root: string): Promise<void> {
    if (await this.isDir(root)) {
      return;
    }

    /**
     * @todo implements permission
     * @todo implements umask
     */

    await mkdirs(root);

    if (!await this.isDir(root)) {
      throw new Error(`Impossible to create the root directory "${root}".`);
    }
  }
}
