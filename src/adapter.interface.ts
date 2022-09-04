import { ReadInterface } from './read.interface';

export interface AdapterInterface extends ReadInterface {
  write(
    path: string,
    contents: string | Buffer | Uint8Array,
    config?: any,
  ): Promise<any>;

  writeStream(path: string, resource: any, config?: any): Promise<any>;

  update(
    path: string,
    contents: string | Buffer | Uint8Array,
    config?: any,
  ): Promise<any>;

  updateStream(path: string, resource: any, config?: any): Promise<any>;

  rename(path: string, newpath: string): Promise<boolean>;

  copy(path: string, newpath: string): Promise<boolean>;

  delete(path: string): Promise<boolean>;

  deleteDir(path: string): Promise<any | false>;

  createDir(path: string, config?: any): Promise<boolean>;

  setVisibility(path: string, visibility: 'public' | 'private'): Promise<any>;
}
