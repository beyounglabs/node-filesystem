import { ListContentsResponse } from '../response/list.contents.response';

export interface AdapterInterface {
  has(path: string): Promise<boolean>;

  read(path: string): Promise<string | false>;

  readStream(path: string): Promise<any | false>;

  listContents(
    folder: string,
    recursive: boolean,
  ): Promise<ListContentsResponse[]>;

  getMetadata(path: string): Promise<any | false>;

  getSize(path: string): Promise<number | false>;

  getMimetype(path: string): Promise<string | false>;

  getTimestamp(path: string): Promise<string | false>;

  getVisibility(path: string): Promise<'public' | 'private' | false>;

  write(path: string, content: string, config?: any[]): Promise<boolean>;

  writeStream(path: string, resource: any, config?: any[]): Promise<boolean>;

  update(path: string, content: string, config?: any[]): Promise<boolean>;

  updateStream(path: string, resource: any, config?: any[]): Promise<boolean>;

  rename(path: string, newPath: string): Promise<boolean>;

  copy(path: string, newPath: string): Promise<boolean>;

  delete(path: string): Promise<boolean>;

  deleteDir(path: string): Promise<boolean>;

  createDir(path: string): Promise<boolean>;

  setVisibility(
    path: string,
    visibility: 'public' | 'private',
  ): Promise<boolean>;

  put(path: string, content: string, config?: any[]): Promise<boolean>;

  putStream(path: string, resource: any, config?: any[]): Promise<boolean>;

  readAndDelete(path: string): Promise<string>;
}
