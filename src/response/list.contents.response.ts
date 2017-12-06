export class ListContentsResponse {

  public type: 'file' | 'dir';

  public path: string;

  public timestamp: number;

  public size: number;

  public dirname: string;

  public basename: string;

  public filename: string;

}
