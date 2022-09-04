import {
  CommonPrefix as S3CommonPrefix,
  GetObjectCommandOutput,
  HeadObjectCommandOutput,
  ListObjectsV2CommandInput,
  PutObjectCommandInput,
  S3,
  _Object as S3Object,
} from '@aws-sdk/client-s3';
import * as ltrim from 'ltrim';
import * as mime from 'mime';
import * as rtrim from 'rtrim';
import { AdapterInterface } from '../adapter.interface';
import { ListContentsResponse } from '../response/list.contents.response';
import { UtilHelper } from '../util.helper';
import { AbstractAdapter } from './abstract.adapter';

interface Object extends S3Object {}

interface CommonPrefix extends S3CommonPrefix {}

export class S3Adapter extends AbstractAdapter implements AdapterInterface {
  public readonly PUBLIC_GRANT_URI =
    'http://acs.amazonaws.com/groups/global/AllUsers';

  protected client: S3;

  protected bucket: string;

  protected options: any;

  protected resultMap = {
    Body: 'contents',
    ContentLength: 'size',
    ContentType: 'mimetype',
    Size: 'size',
    Metadata: 'metadata',
  };

  protected metaOptions = [
    'CacheControl',
    'Expires',
    'StorageClass',
    'ServerSideEncryption',
    'Metadata',
    'ACL',
    'ContentType',
    'ContentEncoding',
    'ContentDisposition',
    'ContentLength',
    'Tagging',
    'WebsiteRedirectLocation',
    'SSEKMSKeyId',
  ];

  constructor(
    client: S3,
    bucket: string,
    prefix: string = '',
    options: any = {},
  ) {
    super();

    this.client = client;

    this.bucket = bucket;
    this.options = options;
    this.setPathPrefix(prefix);
  }

  public getBucket(): string {
    return this.bucket;
  }

  public setBucket(bucket: string): void {
    this.bucket = bucket;
  }

  public getClient(): S3 {
    return this.client;
  }

  protected normalizeResponsePut(
    response: PutObjectCommandInput,
    path: string,
  ) {
    let result: any = {
      path: path ? path : this.removePathPrefix(response.Key ?? ''),
    };

    result = { ...result, ...UtilHelper.pathinfo(result.path) };

    if (response.Body) {
      response.Body = response.Body.toString();
    }

    if (result.path.substr(-1) === '/') {
      result.type = 'dir';
      result.path = rtrim(result.path, '/');

      return result;
    }

    result.type = 'file';

    return {
      ...result,
      ...UtilHelper.map(response, this.resultMap),
    };
  }

  protected normalizeResponseGet(
    response: GetObjectCommandOutput,
    path: string,
  ) {
    let result: any = {
      path: path,
    };

    result = { ...result, ...UtilHelper.pathinfo(result.path) };

    if (result.path.substr(-1) === '/') {
      result.type = 'dir';
      result.path = rtrim(result.path, '/');

      return result;
    }

    result.type = 'file';

    return {
      ...result,
      ...UtilHelper.map(response, this.resultMap),
    };
  }

  protected normalizeResponseHead(
    response: HeadObjectCommandOutput,
    path: string,
  ) {
    let result: any = {
      path: path,
    };

    result = { ...result, ...UtilHelper.pathinfo(result.path) };

    if (response.LastModified) {
      result.timestamp = new Date(response.LastModified).getTime() / 1000;
    }

    if (result.path.substr(-1) === '/') {
      result.type = 'dir';
      result.path = rtrim(result.path, '/');

      return result;
    }

    result.type = 'file';

    return {
      ...result,
      ...UtilHelper.map(response, this.resultMap),
    };
  }

  protected normalizeResponseObject(response: Object, path: string) {
    let result: any = {
      path: path ? path : this.removePathPrefix(response.Key ?? ''),
    };

    result = { ...result, ...UtilHelper.pathinfo(result.path) };

    if (response.LastModified) {
      result.timestamp = new Date(response.LastModified).getTime() / 1000;
    }

    if (result.path.substr(-1) === '/') {
      result.type = 'dir';
      result.path = rtrim(result.path, '/');

      return result;
    }

    result.type = 'file';

    return {
      ...result,
      ...UtilHelper.map(response, this.resultMap),
    };
  }

  protected normalizeResponseCommonPrefix(
    response: CommonPrefix,
    path: string,
  ) {
    let result: any = {
      path: path ? path : this.removePathPrefix(response.Prefix ?? ''),
    };

    result = { ...result, ...UtilHelper.pathinfo(result.path) };

    if (result.path.substr(-1) === '/') {
      result.type = 'dir';
      result.path = rtrim(result.path, '/');

      return result;
    }

    result.type = 'file';

    return {
      ...result,
      ...UtilHelper.map(response, this.resultMap),
    };
  }

  /**
   *
   * @todo Implement pagination, that method only return 1000 objects
   */
  public async listContents(
    directory: string,
    recursive: boolean = false,
  ): Promise<ListContentsResponse[]> {
    const prefix = this.applyPathPrefix(rtrim(directory, '/') + '/');
    const s3Params: ListObjectsV2CommandInput = {
      Bucket: this.getBucket(),
      Prefix: prefix,
    };

    if (!recursive) {
      s3Params.Delimiter = '/';
    }

    const response: ListContentsResponse[] = [];

    const data = await this.getClient().listObjectsV2(s3Params);

    for (const element of data.Contents ?? []) {
      response.push(this.normalizeResponseObject(element, ''));
    }

    for (const element of data.CommonPrefixes ?? []) {
      response.push(this.normalizeResponseCommonPrefix(element, ''));
    }

    const responseEmulated = UtilHelper.emulateDirectories(response).filter(
      (item) => {
        return rtrim(item.path, '/') !== rtrim(directory, '/');
      },
    );

    return responseEmulated;
  }

  public async write(
    path: string,
    contents: string | Buffer | Uint8Array,
    config: any = {},
  ): Promise<any> {
    return await this.upload(path, contents, config);
  }

  protected async upload(
    path: string,
    contents: string | Buffer | Uint8Array,
    config: any = {},
  ): Promise<any> {
    const key = this.applyPathPrefix(path);
    const options = this.getOptionsFromConfig(config);

    const acl = options['ACL'] ? options['ACL'] : 'private';

    let Body = contents;
    let ContentLength = 0;
    if (typeof Buffer !== 'undefined') {
      Body = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
      ContentLength = Buffer.byteLength(contents);
    } else if (typeof contents === 'string') {
      // convert to Uint8Array
      // Cloudflare Workers do not support Buffer
      Body = new TextEncoder().encode(contents);
    }

    if (Body instanceof Uint8Array) {
      ContentLength = Body.byteLength;
    }

    const s3Params: PutObjectCommandInput = {
      ...{
        Body,
        ContentLength,
        Key: key,
        Bucket: this.getBucket(),
        ContentType: mime.getType(path) || 'application/octet-stream',
        ACL: acl,
      },
      ...options,
    };

    await this.getClient().putObject(s3Params);
    s3Params.Body = contents;
    return this.normalizeResponsePut(s3Params, path);
  }

  public async read(path: string): Promise<any | false> {
    const key = this.applyPathPrefix(path);

    const s3Params = {
      ...{
        Key: key,
        Bucket: this.getBucket(),
      },
      ...this.options,
    };

    const response = await this.getClient().getObject(s3Params);

    return this.normalizeResponseGet(response, path);
  }

  public async delete(path: string): Promise<boolean> {
    const key = this.applyPathPrefix(path);
    if (path[path.length - 1] === '/') {
      return false;
    }

    try {
      await this.getClient().deleteObject({
        Bucket: this.getBucket(),
        Key: key,
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  public async has(path: string): Promise<boolean> {
    const key = this.applyPathPrefix(path);

    try {
      await this.getClient().headObject({
        Bucket: this.getBucket(),
        Key: key,
      });

      return true;
    } catch (e) {
      return await this.doesDirectoryExist(key);
    }
  }

  public async readStream(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getMetadata(path: string): Promise<any> {
    const key = this.applyPathPrefix(path);

    try {
      const data = await this.getClient().headObject({
        Bucket: this.getBucket(),
        Key: key,
      });

      return this.normalizeResponseHead(data, path);
    } catch (e) {
      // @todo review this
      return false;
    }
  }

  public async getSize(path: string): Promise<any> {
    throw new Error('Not implemented yet');
  }

  public async getMimetype(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getTimestamp(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getVisibility(path: string): Promise<any | false> {
    return { visibility: await this.getRawVisibility(path) };
  }

  protected async getRawVisibility(path: string): Promise<any | false> {
    const key = this.applyPathPrefix(path);
    const request = {
      Bucket: this.getBucket(),
      Key: key,
    };

    let visibility = 'private';
    try {
      const data = await this.getClient().getObjectAcl(request);

      data.Grants?.forEach((grant) => {
        if (
          grant.Grantee &&
          grant.Grantee.URI &&
          grant.Grantee.URI === this.PUBLIC_GRANT_URI &&
          grant.Permission === 'READ'
        ) {
          visibility = 'public';
        }
      });

      return visibility;
    } catch (e) {
      console.log('getRawVisibilityError', e);
      return visibility;
    }
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
    return await this.upload(path, contents, config);
  }

  public async updateStream(
    path: string,
    resource: any,
    config?: any,
  ): Promise<any> {
    throw new Error('Not implemented yet');
  }

  public async rename(path: string, newpath: string): Promise<boolean> {
    if (!(await this.copy(path, newpath))) {
      return false;
    }

    return await this.delete(path);
  }

  public async copy(path: string, newpath: string): Promise<boolean> {
    const key = this.applyPathPrefix(newpath);

    const request = {
      ...{
        Bucket: this.getBucket(),
        Key: key,
        CopySource: encodeURIComponent(
          this.getBucket() + '/' + this.applyPathPrefix(path),
        ),
        ACL:
          (await this.getRawVisibility(path)) === 'public'
            ? 'public-read'
            : 'private',
      },
      ...this.options,
    };

    try {
      await this.getClient().copyObject(request);
      return true;
    } catch (e) {
      // @todo change that
      return false;
    }
  }

  public async deleteDir(dirname: string): Promise<boolean> {
    throw new Error('Not implemented yet');
    // const key = rtrim(this.applyPathPrefix(dirname), '/') + '/';

    // const s3Params = {
    //   Bucket: this.getBucket(),
    //   Key: key,
    // };

    // const deleter = this.s3Client.deleteDir(s3Params);

    // return new Promise<boolean>((done) => {
    //   deleter.on('error', (err) => {
    //     done(false);
    //   });

    //   deleter.on('end', () => {
    //     done(true);
    //   });
    // });
  }

  public async createDir(dirname: string, config?: any): Promise<any | false> {
    return await this.upload(rtrim(dirname, '/') + '/', '', config);
  }

  public async setVisibility(
    path: string,
    visibility: 'public' | 'private',
  ): Promise<any | false> {
    const key = this.applyPathPrefix(path);
    const request = {
      Bucket: this.getBucket(),
      Key: key,
      ACL: visibility === 'public' ? 'public-read' : 'private',
    };

    try {
      await this.getClient().putObjectAcl(request);

      return { path, visibility };
    } catch (e) {
      // @todo change that
      return false;
    }
  }

  protected async doesDirectoryExist(location: string): Promise<boolean> {
    const request = {
      Bucket: this.getBucket(),
      Prefix: rtrim(location, '/') + '/',
      MaxKeys: 1,
    };
    try {
      const data = await this.getClient().listObjects(request);

      return !!(
        (data.Contents && data.Contents.length) ||
        (data.CommonPrefixes && data.CommonPrefixes.length)
      );
    } catch (e) {
      return false;
    }
  }

  public applyPathPrefix(path) {
    return ltrim(super.applyPathPrefix(path), '/');
  }

  protected getOptionsFromConfig(config) {
    const options = this.options;

    if (config && config.visibility) {
      options.visibility = config.visibility;
      options.ACL = config.visibility === 'public' ? 'public-read' : 'private';
    }

    for (const option of this.metaOptions) {
      if (!config[option]) {
        continue;
      }

      options[option] = config[option];
    }

    return options;
  }
}
