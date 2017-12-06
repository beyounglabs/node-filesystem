import { writeFile } from 'fs';
import { createClient } from 's3';
import { promisify } from 'util';
import * as uid from 'uid';

import * as env from '../../../env';
import { ListContentsResponse } from '../response/list.contents.response';
import { AbstractAdapter } from './abstract.adapter';
import { NativeAdapter } from './native.adapter';
import { AdapterInterface } from '../adapter.interface';

const writeFileAsync = promisify(writeFile);

let client;

export class S3Adapter extends AbstractAdapter implements AdapterInterface {
  protected bucket: string;

  public getBucket(): string {
    return this.bucket;
  }

  public setBucket(bucket: string): void {
    this.bucket = bucket;
  }

  public getClient() {
    if (client) {
      return client;
    }

    client = createClient({
      s3Options: {
        accessKeyId: env.aws_access_key_id,
        secretAccessKey: env.aws_secret_access_key,
        region: env.aws_region,
      },
    });

    return client;
  }

  protected normalizeResponse(response: any, path: string) {
    let result: any = {
      path: path
        ? ''
        : this.removePathPrefix(response.Key ? response.Key : response.Prefix),
    };

    return result;
  }

  public async listContents(
    folder: string,
    recursive: boolean = false,
  ): Promise<ListContentsResponse[]> {
    folder = `${folder}/`;
    const s3Params: any = {
      Bucket: this.getBucket(),
      Prefix: folder,
    };

    if (recursive === false) {
      s3Params.Delimiter = '/';
    }

    const finder = this.getClient().listObjects({
      s3Params,
      recursive,
    });

    const response: ListContentsResponse[] = [];

    return new Promise<ListContentsResponse[]>((done, reject) => {
      finder.on('data', data => {
        console.log(data.Contents);
        data.Contents.forEach(element => {
          if (element.Key === folder) {
            return;
          }
          const listContentsResponse: ListContentsResponse = new ListContentsResponse();
          listContentsResponse.path = element.Key.split('/').splice(-1)[0];
          listContentsResponse.type = 'file';
          response.push(listContentsResponse);
        });
      });

      finder.on('end', () => {
        done(response);
      });

      finder.on('error', message => {
        reject();
      });
    });
  }

  public async write(path: string, contents: string): Promise<any> {
    const s3Params = {
      Body: Buffer.from(contents),
      Key: path,
      Bucket: this.getBucket(),
      ContentType: 'application/octet-stream',
    };

    const s3 = this.getClient().s3;

    return new Promise<any>(async (done, reject) => {
      s3.putObject(s3Params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          done();
        }
      });
    });
  }

  public async read(path: string): Promise<any> {
    const downloader = this.getClient().downloadBuffer({
      Key: path,
      Bucket: this.getBucket(),
    });

    return new Promise<any>(done => {
      downloader.on('error', done(''));

      downloader.on('end', buffer => {
        const response = {
          type: 'file',
          path,
          contents: buffer.toString('utf8'),
        };
        done(response);
      });
    });
  }

  public async delete(path: string): Promise<boolean> {
    const params = {
      Bucket: this.getBucket(),
      Delete: {
        Objects: [
          {
            Key: path,
          },
        ],
      },
    };

    return new Promise<boolean>(done => {
      const deleter = this.getClient().deleteObjects(params);
      deleter.on('end', function() {
        done(true);
      });
    });
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
}
