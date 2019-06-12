import * as AWS from 'aws-sdk';
import * as ltrim from 'ltrim';
import * as mime from 'mime';
import * as rtrim from 'rtrim';
import { createClient } from 's3-client';
import { AdapterInterface } from '../adapter.interface';
import { ListContentsResponse } from '../response/list.contents.response';
import { UtilHelper } from '../util.helper';
import { AbstractAdapter } from './abstract.adapter';

export class S3Adapter extends AbstractAdapter implements AdapterInterface {
  public readonly PUBLIC_GRANT_URI =
    'http://acs.amazonaws.com/groups/global/AllUsers';

  protected client: AWS.S3;

  protected s3Client: any;

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
    client: AWS.S3,
    bucket: string,
    prefix: string = '',
    options: any = {},
  ) {
    super();

    this.client = client;
    this.s3Client = createClient({ s3Client: client });
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

  public getClient(): AWS.S3 {
    return this.client;
  }

  protected normalizeResponse(response: any, path: string) {
    let result: any = {
      path: path
        ? path
        : this.removePathPrefix(response.Key ? response.Key : response.Prefix),
    };

    result = { ...result, ...UtilHelper.pathinfo(result.path) };

    if (response.LastModified) {
      result.timestamp = new Date(response.LastModified).getTime() / 1000;
    }

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

  /**
   *
   * @todo Implement pagination, that method only return 1000 objects
   */
  public async listContents(
    directory: string,
    recursive: boolean = false,
  ): Promise<ListContentsResponse[]> {
    const prefix = this.applyPathPrefix(rtrim(directory, '/') + '/');
    const s3Params: any = {
      Bucket: this.getBucket(),
      Prefix: prefix,
    };

    if (!recursive) {
      s3Params.Delimiter = '/';
    }

    const response: ListContentsResponse[] = [];

    return new Promise<ListContentsResponse[]>(async (done, reject) => {
      await this.getClient().listObjectsV2(s3Params, (err, data: any) => {
        if (err) {
          reject(err);
        } else {
          data.Contents.forEach(element => {
            response.push(this.normalizeResponse(element, ''));
          });

          data.CommonPrefixes.forEach(element => {
            response.push(this.normalizeResponse(element, ''));
          });

          const responseEmulated = UtilHelper.emulateDirectories(
            response,
          ).filter(item => {
            return rtrim(item.path, '/') !== rtrim(directory, '/');
          });

          done(responseEmulated);
        }
      });
    });
  }

  public async write(
    path: string,
    contents: string | Buffer,
    config: any = {},
  ): Promise<any> {
    return await this.upload(path, contents, config);
  }

  protected async upload(
    path: string,
    contents: string | Buffer,
    config: any = {},
  ): Promise<any> {
    const key = this.applyPathPrefix(path);
    const options = this.getOptionsFromConfig(config);

    const acl = options['ACL'] ? options['ACL'] : 'private';

    const s3Params = {
      ...{
        Body: Buffer.isBuffer(contents) ? contents : Buffer.from(contents),
        Key: key,
        Bucket: this.getBucket(),
        ContentLength: Buffer.byteLength(contents),
        ContentType: mime.getType(path) || 'application/octet-stream',
        ACL: acl,
      },
      ...options,
    };

    return new Promise<any>(async (done, reject) => {
      const response = await this.getClient().putObject(
        s3Params,
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            s3Params.Body = contents;
            done(this.normalizeResponse(s3Params, path));
          }
        },
      );
    });
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

    return new Promise<any>(async (done, reject) => {
      const response = await this.getClient().getObject(
        s3Params,
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            done(this.normalizeResponse(data, path));
          }
        },
      );
    });
  }

  public async delete(path: string): Promise<boolean> {
    const key = this.applyPathPrefix(path);

    return new Promise<boolean>(done => {
      if (path[path.length - 1] === '/') {
        done(false);
        return;
      }

      this.getClient().deleteObject(
        {
          Bucket: this.getBucket(),
          Key: key,
        },
        (err, data) => {
          if (err) {
            done(false);
            return;
          }

          done(true);
        },
      );
    });
  }

  public async has(path: string): Promise<boolean> {
    const key = this.applyPathPrefix(path);

    return new Promise<boolean>(done => {
      this.getClient().headObject(
        {
          Bucket: this.getBucket(),
          Key: key,
        },
        async (err, data) => {
          if (err) {
            done(await this.doesDirectoryExist(key));
            return;
          }

          done(true);
        },
      );
    });
  }

  public async readStream(path: string): Promise<any | false> {
    throw new Error('Not implemented yet');
  }

  public async getMetadata(path: string): Promise<any> {
    const key = this.applyPathPrefix(path);

    return new Promise<any>(done => {
      this.getClient().headObject(
        {
          Bucket: this.getBucket(),
          Key: key,
        },
        (err, data) => {
          if (err) {
            done(false);
            return;
          }

          done(this.normalizeResponse(data, path));
        },
      );
    });
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

    return new Promise<string>(done => {
      this.getClient().getObjectAcl(
        {
          Bucket: this.getBucket(),
          Key: key,
        },
        (err, data: any) => {
          let visibility = 'private';
          if (err) {
            console.log('getRawVisibilityError', err);
            done(visibility);
            return;
          }

          data.Grants.forEach(grant => {
            if (
              grant.Grantee &&
              grant.Grantee.URI &&
              grant.Grantee.URI === this.PUBLIC_GRANT_URI &&
              grant.Permission === 'READ'
            ) {
              visibility = 'public';
            }
          });

          done(visibility);
        },
      );
    });
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

    return new Promise<boolean>(async done => {
      this.getClient().copyObject(
        {
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
        },
        (err, data) => {
          if (err) {
            done(false);
            return;
          }

          done(true);
        },
      );
    });
  }

  public async deleteDir(dirname: string): Promise<boolean> {
    const key = rtrim(this.applyPathPrefix(dirname), '/') + '/';

    const s3Params = {
      Bucket: this.getBucket(),
      Key: key,
    };

    const deleter = this.s3Client.deleteDir(s3Params);

    return new Promise<boolean>(done => {
      deleter.on('error', err => {
        done(false);
      });

      deleter.on('end', () => {
        done(true);
      });
    });
  }

  public async createDir(dirname: string, config?: any): Promise<any | false> {
    return await this.upload(rtrim(dirname, '/') + '/', '', config);
  }

  public async setVisibility(
    path: string,
    visibility: 'public' | 'private',
  ): Promise<any | false> {
    const key = this.applyPathPrefix(path);
    return new Promise<any | false>(done => {
      this.getClient().putObjectAcl(
        {
          Bucket: this.getBucket(),
          Key: key,
          ACL: visibility === 'public' ? 'public-read' : 'private',
        },
        (err, data: any) => {
          if (err) {
            done(false);
            return;
          }

          done({ path, visibility });
        },
      );
    });
  }

  protected async doesDirectoryExist(location: string): Promise<boolean> {
    return new Promise<any | false>(done => {
      this.getClient().listObjects(
        {
          Bucket: this.getBucket(),
          Prefix: rtrim(location, '/') + '/',
          MaxKeys: 1,
        },
        (err, data: any) => {
          if (err) {
            done(false);
            return;
          }

          done(
            !!(
              (data.Contents && data.Contents.length) ||
              (data.CommonPrefixes && data.CommonPrefixes.length)
            ),
          );
        },
      );
    });
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
