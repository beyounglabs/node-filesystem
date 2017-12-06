import { ListContentsResponse } from './response/list.contents.response';

export interface ReadInterface {
  has(path: string): Promise<boolean>;

  read(path: string): Promise<any | false>;

  readStream(path: string): Promise<any | false>;

  listContents(
    directory: string,
    recursive?: boolean,
  ): Promise<ListContentsResponse[]>;

  getMetadata(path: string): Promise<any>;

  getSize(path: string): Promise<any>;

  getMimetype(path: string): Promise<any | false>;

  getTimestamp(path: string): Promise<any | false>;

  getVisibility(path: string): Promise<any | false>;
}
