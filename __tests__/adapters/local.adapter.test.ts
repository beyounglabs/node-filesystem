import 'reflect-metadata';

import { expect } from 'chai';
import { LocalAdapter } from '../../src/adapters/local.adapter';
describe('LocalAdapterTest', function() {
  this.timeout(5000);

  const localAdapter = new LocalAdapter(__dirname + '/data');

  describe('files', () => {
    it('write', async () => {
      const writeResponse = await localAdapter.write('test/1.txt', 'test');

      expect(writeResponse.contents).to.equals('test');
      expect(writeResponse.path).to.equals('test/1.txt');
      expect(writeResponse.type).to.equals('file');
      expect(writeResponse.size).to.equals(4);

      expect(await localAdapter.has('test/1.txt')).to.true;
    });

    it('copy', async () => {
      await localAdapter.delete('test/2.txt');
      expect(await localAdapter.has('test/2.txt')).to.false;
      expect(await localAdapter.copy('test/1.txt', 'test/2.txt')).to.true;
      expect(await localAdapter.has('test/2.txt')).to.true;
    });

    it('metadata', async () => {
      const metadata = await localAdapter.getMetadata('test/2.txt');
      expect(metadata.type).to.equals('file');
      expect(metadata.path).to.equals('test/2.txt');
      expect(String(metadata.timestamp).length).to.equals(10);
      expect(metadata.size).to.equals(4);
    });

    it('write', async () => {
      const file1Txt = await localAdapter.read('test/1.txt');
      expect(file1Txt.contents).to.equals('test');
      expect(file1Txt.path).to.equals('test/1.txt');
      expect(file1Txt.type).to.equals('file');
    });

    it('listContents', async () => {
      const files = await localAdapter.listContents('test/');
      expect(files.length).to.equals(2);
      expect(files[0].type).to.equals('file');
      expect(files[0].path).to.equals('1.txt');
      expect(String(files[0].timestamp).length).to.equals(10);
      expect(files[0].size).to.equals(4);
    });

    it('delete', async () => {
      // Delete folder with delete method return false
      expect(await localAdapter.delete('test/')).to.false;
      expect(await localAdapter.delete('test/1.txt')).to.true;
      expect(await localAdapter.delete('test/2.txt')).to.true;
    });
  });

  describe('dirs', () => {
    it('create', async () => {
      expect(await localAdapter.has('test2/test3/test4')).to.false;

      const createDirResponse = await localAdapter.createDir(
        'test2/test3/test4',
      );

      expect(createDirResponse.path).to.equals('test2/test3/test4');
      expect(createDirResponse.type).to.equals('dir');

      expect(await localAdapter.has('test2/test3/test4')).to.true;
    });

    it('metadata', async () => {
      const metadata = await localAdapter.getMetadata('test2/');
      expect(metadata.type).to.equals('dir');
      expect(metadata.path).to.equals('test2/');
      expect(String(metadata.timestamp).length).to.equals(10);
    });

    it('rename', async () => {
      expect(await localAdapter.rename('test2/test3', 'test2/test31')).to.true;
      expect(await localAdapter.has('test2/test3/test4')).to.false;
      expect(await localAdapter.has('test2/test31/test4')).to.true;
    });

    it('copy', async () => {
      expect(await localAdapter.copy('test2/test31', 'test2/test32')).to.true;
      expect(await localAdapter.has('test2/test32/test4')).to.true;
    });

    it('delete', async () => {
      expect(await localAdapter.deleteDir('test2/test31/test4')).to.true;
      expect(await localAdapter.deleteDir('test2')).to.true;
    });
  });
});
