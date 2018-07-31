import { expect } from 'chai';
import * as env from '../../env';
import * as Storage from '@google-cloud/storage';
import { GoogleStorageAdapter } from '../../src/adapters/google.storage.adapter';

describe.only('GoogleStorageAdapterTest', function() {
  this.timeout(10000);

  const googleStorageClient = new Storage({
    projectId: env.google_cloud_storage_project_id,
  });

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS =
      __dirname + '/../../gcp-credentials.json';
  }

  const adapter = new GoogleStorageAdapter(
    googleStorageClient,
    env.google_cloud_storage_bucket,
    'unittest',
  );

  describe('files', () => {
    it('write', async () => {
      await adapter.delete('test/2.txt');
      const writeResponse = await adapter.write('test/1.txt', 'test');

      expect(writeResponse.contents).to.equals('test');
      expect(writeResponse.path).to.equals('test/1.txt');
      expect(writeResponse.type).to.equals('file');
      expect(writeResponse.size).to.equals(4);

      expect(await adapter.has('test/1.txt')).to.true;
      expect(await adapter.has('test/2.txt')).to.false;
    });

    // it('visibility', async () => {
    //   let fileVisibility = await adapter.getVisibility('test/1.txt');
    //   expect(fileVisibility.visibility).to.equals('private');

    //   await adapter.setVisibility('test/1.txt', 'public');
    //   fileVisibility = await adapter.getVisibility('test/1.txt');
    //   expect(fileVisibility.visibility).to.equals('public');

    //   await adapter.setVisibility('test/1.txt', 'public');
    //   fileVisibility = await adapter.getVisibility('test/1.txt');
    //   expect(fileVisibility.visibility).to.equals('public');
    // });

    it('copy', async () => {
      await adapter.delete('test/2.txt');
      expect(await adapter.has('test/2.txt')).to.false;
      expect(await adapter.copy('test/1.txt', 'test/2.txt')).to.true;
      expect(await adapter.has('test/2.txt')).to.true;
    });

    it('rename', async () => {
      expect(await adapter.rename('test/2.txt', 'test/3.txt')).to.true;
      expect(await adapter.has('test/2.txt')).to.false;
      expect(await adapter.has('test/3.txt')).to.true;
      expect(await adapter.rename('test/3.txt', 'test/2.txt')).to.true;
    });

    it('metadata', async () => {
      const metadata = await adapter.getMetadata('test/2.txt');
      expect(metadata.type).to.equals('file');
      expect(metadata.path).to.equals('test/2.txt');
      expect(String(metadata.timestamp).length).to.equals(10);
      expect(metadata.size).to.equals(4);
    });

    it('read', async () => {
      const file1Txt = await adapter.read('test/1.txt');
      expect(file1Txt.contents).to.equals('test');
      expect(file1Txt.path).to.equals('test/1.txt');
      expect(file1Txt.type).to.equals('file');
    });

    it('listContents', async () => {
      const files = await adapter.listContents('test/');
      expect(files.length).to.equals(2);
      expect(files[0].type).to.equals('file');
      expect(files[0].path).to.equals('test/1.txt');

      expect(String(files[0].timestamp).length).to.equals(10);

      expect(files[0].size).to.equals(4);
    });

    it('delete', async () => {
      // Delete folder with delete method return false
      expect(await adapter.delete('test/')).to.false;
      expect(await adapter.delete('test/1.txt')).to.true;
      expect(await adapter.delete('test/2.txt')).to.true;
    });
  });

  describe('dirs', () => {
    it('create', async () => {
      await adapter.deleteDir('test2/test3/test4');
      expect(await adapter.has('test2/test3/test4')).to.false;

      const createDirResponse = await adapter.createDir('test2/test3/test4');

      expect(createDirResponse.path).to.equals('test2/test3/test4');
      expect(createDirResponse.type).to.equals('dir');

      expect(await adapter.has('test2/test3/test4/')).to.true;
    });

    it('list contents recursive', async () => {
      await adapter.deleteDir('test2/test3/');
      await adapter.createDir('test2/test31/test4');
      await adapter.createDir('test2/test32/test4');
      await adapter.write('test2/test.txt', 'test');

      const recursiveList = await adapter.listContents('test2', true);

      expect(recursiveList[0].type).to.equals('file');
      expect(recursiveList[0].path).to.equals('test2/test.txt');
      expect(recursiveList[0].dirname).to.equals('test2');

      expect(recursiveList[1].type).to.equals('dir');
      expect(recursiveList[1].path).to.equals('test2/test31');
      expect(recursiveList[1].dirname).to.equals('test2');

      expect(recursiveList[2].type).to.equals('dir');
      expect(recursiveList[2].path).to.equals('test2/test31/test4');
      expect(recursiveList[2].dirname).to.equals('test2/test31');

      expect(recursiveList[3].type).to.equals('dir');
      expect(recursiveList[3].path).to.equals('test2/test32');
      expect(recursiveList[3].dirname).to.equals('test2');

      expect(recursiveList[4].type).to.equals('dir');
      expect(recursiveList[4].path).to.equals('test2/test32/test4');
      expect(recursiveList[4].dirname).to.equals('test2/test32');

      const list = await adapter.listContents('test2/');

      expect(list[0].type).to.equals('file');
      expect(list[0].path).to.equals('test2/test.txt');
      expect(list[0].dirname).to.equals('test2');

      expect(list[1].type).to.equals('dir');
      expect(list[1].path).to.equals('test2/test31');
      expect(list[0].dirname).to.equals('test2');

      expect(list[2].type).to.equals('dir');
      expect(list[2].path).to.equals('test2/test32');
      expect(list[0].dirname).to.equals('test2');
    });

    it('delete', async () => {
      expect(await adapter.deleteDir('test2/test31/test4')).to.true;
      expect(await adapter.deleteDir('test2')).to.true;
    });
  });
});
