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

    it('visibility', async () => {
      let fileVisibility = await localAdapter.getVisibility('test/1.txt');
      expect(fileVisibility.visibility).to.equals('public');

      await localAdapter.setVisibility('test/1.txt', 'private');
      fileVisibility = await localAdapter.getVisibility('test/1.txt');
      expect(fileVisibility.visibility).to.equals('private');

      await localAdapter.setVisibility('test/1.txt', 'public');
      fileVisibility = await localAdapter.getVisibility('test/1.txt');
      expect(fileVisibility.visibility).to.equals('public');
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

    it('read', async () => {
      const file1Txt = await localAdapter.read('test/1.txt');
      expect(file1Txt.contents).to.equals('test');
      expect(file1Txt.path).to.equals('test/1.txt');
      expect(file1Txt.type).to.equals('file');
    });

    it('listContents', async () => {
      const files = await localAdapter.listContents('test/');
      expect(files.length).to.equals(2);
      expect(files[0].type).to.equals('file');
      expect(files[0].path).to.equals('test/1.txt');
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

    it('list contents recursive', async () => {
      await localAdapter.write('test2/test.txt', 'test');

      const recursiveList = await localAdapter.listContents('test2', true);

      expect(recursiveList[0].type).to.equals('file');
      expect(recursiveList[0].path).to.equals('test2/test.txt');

      expect(recursiveList[1].type).to.equals('dir');
      expect(recursiveList[1].path).to.equals('test2/test31');

      expect(recursiveList[2].type).to.equals('dir');
      expect(recursiveList[2].path).to.equals('test2/test31/test4');

      expect(recursiveList[3].type).to.equals('dir');
      expect(recursiveList[3].path).to.equals('test2/test32');

      expect(recursiveList[4].type).to.equals('dir');
      expect(recursiveList[4].path).to.equals('test2/test32/test4');

      const list = await localAdapter.listContents('test2/');

      expect(list[0].type).to.equals('file');
      expect(list[0].path).to.equals('test2/test.txt');

      expect(list[1].type).to.equals('dir');
      expect(list[1].path).to.equals('test2/test31');

      expect(list[2].type).to.equals('dir');
      expect(list[2].path).to.equals('test2/test32');
    });

    it('delete', async () => {
      expect(await localAdapter.deleteDir('test2/test31/test4')).to.true;
      expect(await localAdapter.deleteDir('test2')).to.true;
    });
  });
});
