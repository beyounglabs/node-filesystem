import { ListContentsResponse } from './response/list.contents.response';

export interface ReadInterface {
  has(path: string): Promise<boolean>;

  read(path: string): Promise<any | false>;

  readStream(path: string): Promise<any | false>;

  listContents(
    directory: string,
    recursive?: boolean,
  ): Promise<ListContentsResponse[]>;

  getMetadata(path: string): Promise<any | false>;

  getSize(path: string): Promise<any | false>;

  getMimetype(path: string): Promise<any | false>;

  getTimestamp(path: string): Promise<any | false>;

  getVisibility(path: string): Promise<any | false>;
}
