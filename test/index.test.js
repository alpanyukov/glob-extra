'use strict';

const proxyquire = require('proxyquire');
const qfs = require('q-io/fs');
const q = require('q');

describe('path-utils', () => {
    const sandbox = sinon.sandbox.create();

    let glob;
    let globExtra;

    beforeEach(() => {
        sandbox.stub(process, 'cwd').returns('');
        sandbox.stub(qfs, 'listTree');
        sandbox.stub(qfs, 'absolute');
        sandbox.stub(qfs, 'stat').returns(q({isFile: () => true}));

        glob = sandbox.stub();

        globExtra = proxyquire('../lib/index', {glob});
    });

    afterEach(() => sandbox.restore());

    describe('masks', () => {
        it('should get absolute file path from passed mask', () => {
            glob.withArgs('some/deep/**/*.js').yields(null, ['some/deep/path/file.js']);

            qfs.absolute.withArgs('some/deep/path/file.js').returns('/absolute/some/deep/path/file.js');

            return globExtra.expandPaths(['some/deep/**/*.js'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/deep/path/file.js']);
                });
        });

        it('should throw an error if a mask does not match files', () => {
            glob.withArgs('bad/mask/*.js').yields(null, []);

            return assert.isRejected(globExtra.expandPaths(['bad/mask/*.js']), /Cannot find files by mask bad\/mask\/\*\.js/);
        });

        it('should get absolute file path from passed mask according to formats option', () => {
            glob.withArgs('some/path/*.*').yields(null, ['some/path/file.js', 'some/path/file.txt']);

            qfs.absolute
                .withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

            return globExtra.expandPaths(['some/path/*.*'], {formats: ['.js']})
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
                });
        });

        it('should get uniq absolute file path from passed masks', () => {
            glob.withArgs('some/path/*.js').yields(null, ['some/path/file.js']);

            qfs.absolute.withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

            return globExtra.expandPaths(['some/path/*.js', 'some/path/*.js'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
                });
        });
    });

    describe('directories', () => {
        beforeEach(() => {
            qfs.stat.withArgs('some/path/').returns(q({isFile: () => false}));
        });

        it('should get absolute paths for all files from passed dir', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            qfs.listTree.withArgs('some/path/').returns(q(['some/path/first.js', 'some/path/second.txt']));

            qfs.absolute
                .withArgs('some/path/first.js').returns('/absolute/some/path/first.js')
                .withArgs('some/path/second.txt').returns('/absolute/some/path/second.txt');

            return globExtra.expandPaths(['some/path/'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/first.js', '/absolute/some/path/second.txt']);
                });
        });

        it('should get absolute file paths according to formats option', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            qfs.listTree.withArgs('some/path/').returns(q(['some/path/first.js', 'some/path/second.txt']));

            qfs.absolute.withArgs('some/path/first.js').returns('/absolute/some/path/first.js');

            return globExtra.expandPaths(['some/path/'], {formats: ['.js']})
                .then((absolutePaths) => assert.deepEqual(absolutePaths, ['/absolute/some/path/first.js']));
        });

        it('should get uniq absolute file path from passed dirs', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            qfs.listTree.withArgs('some/path/').returns(q(['some/path/file.js']));

            qfs.absolute.withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

            return globExtra.expandPaths(['some/path/', 'some/path/'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
                });
        });

        it('should get only file paths from dir tree', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            qfs.stat.withArgs('some/path/dir').returns(q({isFile: () => false}));

            qfs.listTree.withArgs('some/path/').returns(q(['some/path/file.js', 'some/path/dir']));

            qfs.absolute.withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

            return globExtra.expandPaths(['some/path/'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
                });
        });
    });

    describe('files', () => {
        it('should get absolute file path from passed file path', () => {
            glob.withArgs('some/path/file.js').yields(null, ['some/path/file.js']);

            qfs.absolute.withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

            return globExtra.expandPaths(['some/path/file.js'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
                });
        });

        it('should filter files according to formats option', () => {
            glob
                .withArgs('some/path/file.js').yields(null, ['some/path/file.js'])
                .withArgs('some/path/file.txt').yields(null, ['some/path/file.txt']);

            qfs.absolute
                .withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

            return globExtra.expandPaths(['some/path/file.js', 'some/path/file.txt'], {formats: ['.js']})
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
                });
        });

        it('should get uniq absolute file path', () => {
            glob.withArgs('some/path/file.js').yields(null, ['some/path/file.js']);

            qfs.absolute.withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

            return globExtra.expandPaths(['some/path/file.js', 'some/path/file.js'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
                });
        });
    });

    describe('defaults', () => {
        it('should use project root passed from root option', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            qfs.stat.withArgs('/project/root/some/path').returns(q({isFile: () => false}));

            qfs.listTree.withArgs('/project/root/some/path').returns(q(['/project/root/some/path/file.js']));

            qfs.absolute.withArgs('/project/root/some/path/file.js')
                .returns('/absolute/project/root/some/path/file.js');

            return globExtra.expandPaths(['some/path/'], {root: '/project/root'})
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/project/root/some/path/file.js']);
                });
        });

        it('should use current project directory if project root is not passed from root option', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            process.cwd.returns('/root');

            qfs.stat.withArgs('/root/some/path').returns(q({isFile: () => false}));

            qfs.listTree.withArgs('/root/some/path').returns(q(['/root/some/path/file.js']));

            qfs.absolute.withArgs('/root/some/path/file.js').returns('/absolute/root/some/path/file.js');

            return globExtra.expandPaths(['some/path/'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/root/some/path/file.js']);
                });
        });
    });
});
