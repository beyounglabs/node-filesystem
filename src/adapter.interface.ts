import { ListContentsResponse } from './response/list.contents.response';
import { ReadInterface } from './read.interface';

export interface AdapterInterface extends ReadInterface {
  write(path: string, contents: string, config?: any): Promise<any>;

  writeStream(path: string, resource: any, config?: any): Promise<any>;

  update(path: string, contents: string, config?: any): Promise<any>;

  updateStream(path: string, resource: any, config?: any): Promise<any>;

  rename(path: string, newPath: string): Promise<boolean>;

  copy(path: string, newPath: string): Promise<boolean>;

  delete(path: string): Promise<boolean>;

  deleteDir(path: string): Promise<boolean>;

  createDir(path: string): Promise<boolean>;

  setVisibility(
    path: string,
    visibility: 'public' | 'private',
  ): Promise<any>;
}
