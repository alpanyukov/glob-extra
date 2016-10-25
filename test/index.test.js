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
        sandbox.stub(qfs, 'stat').returns(q({isFile: () => true}));

        glob = sandbox.stub();

        globExtra = proxyquire('../lib/index', {glob});
    });

    afterEach(() => sandbox.restore());

    describe('masks', () => {
        beforeEach(() => {
            sandbox.stub(qfs, 'absolute');
        });

        it('should get absolute file path from passed mask', () => {
            glob.withArgs('some/deep/**/*.js').yields(null, ['some/deep/path/file.js']);

            qfs.absolute.withArgs('some/deep/path/file.js').returns('/absolute/some/deep/path/file.js');

            return globExtra.expandPaths(['some/deep/**/*.js'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/deep/path/file.js']);
                });
        });

        it('should throw error for unexistent file path', () => {
            glob.withArgs('bad/mask/file.js').yields(null, []);
            return assert.isRejected(globExtra.expandPaths(['bad/mask/file.js']), 'Cannot find files by mask bad/mask/file.js');
        });

        it('should throw error for unexistent directory path', () => {
            glob.withArgs('bad/mask').yields(null, []);
            return assert.isRejected(globExtra.expandPaths(['bad/mask']), 'Cannot find files by mask bad/mask');
        });

        it('should ignore masks which do not match to files', () => {
            glob.withArgs('bad/mask/*.js').yields(null, []);
            glob.withArgs('some/path/*.js').yields(null, ['some/path/file.js']);

            qfs.absolute.returnsArg(0);

            return globExtra.expandPaths([
                'bad/mask/*.js',
                'some/path/*.js'
            ]).then((absolutePaths) => assert.deepEqual(absolutePaths, ['some/path/file.js']));
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
            qfs.stat.withArgs('some/path').returns(q({isFile: () => false}));
            sandbox.stub(qfs, 'absolute');
        });

        it('should get absolute paths for all files from passed dir', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            qfs.listTree.withArgs('some/path').returns(q(['some/path/first.js', 'some/path/second.txt']));
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

            qfs.listTree.withArgs('some/path').returns(q(['some/path/first.js', 'some/path/second.txt']));
            qfs.absolute.withArgs('some/path/first.js').returns('/absolute/some/path/first.js');

            return globExtra.expandPaths(['some/path/'], {formats: ['.js']})
                .then((absolutePaths) => assert.deepEqual(absolutePaths, ['/absolute/some/path/first.js']));
        });

        it('should get uniq absolute file path from passed dirs', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            qfs.listTree.withArgs('some/path').returns(q(['some/path/file.js']));
            qfs.absolute.withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

            return globExtra.expandPaths(['some/path/', 'some/path/'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
                });
        });

        it('should get only file paths from dir tree', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            qfs.stat.withArgs('some/path/dir').returns(q({isFile: () => false}));
            qfs.listTree.withArgs('some/path').returns(q(['some/path/file.js', 'some/path/dir']));
            qfs.absolute.withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

            return globExtra.expandPaths(['some/path/'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
                });
        });
    });

    describe('files', () => {
        beforeEach(() => {
            sandbox.stub(qfs, 'absolute');
        });

        it('should get absolute file path from passed string file path', () => {
            glob.withArgs('some/path/file.js').yields(null, ['some/path/file.js']);

            qfs.absolute.withArgs('some/path/file.js').returns('/absolute/some/path/file.js');

            return globExtra.expandPaths('some/path/file.js')
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/absolute/some/path/file.js']);
                });
        });

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

            return globExtra.expandPaths(['some/path/'], {root: '/project/root'})
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/project/root/some/path/file.js']);
                });
        });

        it('should use current project directory if project root is not passed from root option', () => {
            glob.withArgs('some/path/').yields(null, ['some/path/']);

            process.cwd.returns('/root');

            qfs.stat.withArgs('/root/some/path').returns(q({isFile: () => false}));
            qfs.listTree.withArgs('/root/some/path').returns(q(['/root/some/path/file.js']));

            return globExtra.expandPaths(['some/path/'])
                .then((absolutePaths) => {
                    assert.deepEqual(absolutePaths, ['/root/some/path/file.js']);
                });
        });
    });

    describe('glob options', () => {
        beforeEach(() => sandbox.stub(qfs, 'absolute'));

        it('should exclude file paths from passed masks', () => {
            const globOpts = {ignore: ['some/other/*']};

            glob.withArgs('some/**', globOpts).yields(null, ['some/path/file.js']);

            return globExtra.expandPaths('some/**', {formats: ['.js']}, globOpts)
                .then(() => assert.calledWith(glob, 'some/**', globOpts));
        });
    });

    describe('isMask', () => {
        it('should return true if passed pattern specified as mask', () => {
            assert.isOk(globExtra.isMask('some/path/*'));
            assert.isOk(globExtra.isMask('another/**'));
        });

        it('should return false if passed pattern is not a mask', () => {
            assert.isNotOk(globExtra.isMask('some/path/file.js'));
        });
    });
});
