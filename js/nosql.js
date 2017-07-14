const router = module.exports = require('express').Router();
const deferred = require('deferred');
const uuid = require('uuid/v4');
const sql = require('mssql');
const db = require('./db.js');
const auth = require('./auth.js');

var getYourObjects = function(meta, userId) {
    var promise = deferred();
    db.query`
        SELECT *
          FROM JsonObject
         WHERE Line = 0
           AND Meta = ${meta}
           AND UserId = ${userId}
         ORDER BY Label;
    `.then(result => {
        if (result.recordset.length) {
            for (var i = 0; i < result.recordset.length; i++) {
                result.recordset[i].Id = result.recordset[i].Id.toLocaleLowerCase();
            }
            promise.resolve(result.recordset);
        } else {
            promise.reject(404);
        }
    }).catch(err => {
        console.log(err)
        promise.reject(500, err);
    });
    return promise;
};

var getPublicObjects = function(meta, user) {
    var userId = user ? user.id : '';
    var email = user ? user.email : '';

    var promise = deferred();
    db.query`
        SELECT *
          FROM JsonObject
         WHERE Line = 0
           AND Meta = ${meta}
           AND UserId <> ${userId}
           AND ( "Public" = 1
                OR EXISTS (
                    SELECT 1
                      FROM KeyValue
                     WHERE "Key" = Id
                       AND ( Value = ${email} OR Value = '*' )
                       AND Meta = 'allowAccessBy'
                )
               )
         ORDER BY Label;
    `.then(result => {
        if (result.recordset.length) {
            for (var i = 0; i < result.recordset.length; i++) {
                result.recordset[i].Id = result.recordset[i].Id.toLocaleLowerCase();
            }
            promise.resolve(result.recordset);
        } else {
            promise.reject(404);
        }
    }).catch(err => {
        console.log(err)
        promise.reject(500, err);
    });
    return promise;
};

var getUserObjects = function(meta, targetUser, user) {
    var userId = user ? user.id : '';
    var email = user ? user.email : '';

    var promise = deferred();
    db.query`
        SELECT *
          FROM JsonObject
         WHERE Line = 0
           AND Meta = ${meta}
           AND UserId = ${targetUser}
           AND ( UserId = ${userId}
                OR "Public" = 1
                OR EXISTS (
                    SELECT 1
                      FROM KeyValue
                     WHERE "Key" = Id
                       AND ( Value = ${email} OR Value = '*' )
                       AND Meta = 'allowAccessBy'
                )
               )
         ORDER BY Label;
    `.then(result => {
        if (result.recordset.length) {
            for (var i = 0; i < result.recordset.length; i++) {
                result.recordset[i].Id = result.recordset[i].Id.toLocaleLowerCase();
            }
            promise.resolve(result.recordset);
        } else {
            promise.reject(404);
        }
    }).catch(err => {
        console.log(err)
        promise.reject(500, err);
    });
    return promise;
};

var getJsonObject = function(meta, id, user) {
    var userId = user ? user.id : '';
    var email = user ? user.email : '';

    var promise = deferred();
    db.query`
        SELECT *
          FROM JsonObject
         WHERE Meta = ${meta}
           AND Id = ${id}
           AND ( UserId = ${userId}
                OR "Public" = 1
                OR EXISTS (
                    SELECT 1
                      FROM KeyValue
                     WHERE "Key" = ${id}
                       AND ( Value = ${email} OR Value = '*' )
                       AND Meta = 'allowAccessBy'
                )
               );
    `.then(result => {
        if (result.recordset.length) {
            var lines = result.recordset;
            for (var i = 1; i < lines.length; i++) {
                lines[0].Text += lines[i].Text;
            }
            lines[0].Id = lines[0].Id.toLocaleLowerCase();
            delete lines[0].Line;
            promise.resolve(lines[0]);
        } else {
            promise.reject(404);
        }
    }).catch(err => {
        console.log(err)
        promise.reject(500, err);
    });
    return promise;
};

var saveObject = function(body) {
    var promise = deferred();

    const tx = db.transaction();
    tx.begin(err => {
        if (err) {
            console.log('saveObject.begin', err)
            promise.reject(500, err);
            return;
        }

        const req = tx.request();
        var meta = body.Meta;
        var id = body.Id || '00000000-0000-0000-0000-000000000000';
        var userId = body.UserId;
        req.input('meta', sql.VarChar, meta);
        req.input('id', sql.VarChar, id);
        req.input('userId', sql.VarChar, userId);
        req.query('DELETE JsonObject WHERE Meta = @meta AND Id = @id AND UserId = @userId;', (err, result) => {
            if (err) {
                console.log('saveObject.delete', err)
                tx.rollback().then(result => {
                    console.log('rolled back')
                    promise.reject(500, 'rollback');
                }).catch(err => {
                    console.log('saveObject.rollback', err)
                    promise.reject(500, err);
                });
                return;
            }

            // const table = new sql.Table('JsonObject');
            // table.create = false;
            // table.columns.add('Id', sql.UniqueIdentifier, { nullable: false, primary: true } );
            // table.columns.add('Line', sql.Int, { nullable: false, primary: true });
            // table.columns.add('Text', sql.NVarChar(-1), { nullable: false });
            // table.columns.add('UserId', sql.NVarChar(-1), { nullable: false });
            // table.columns.add('Label', sql.NVarChar(-1), { nullable: false });
            // table.columns.add('Meta', sql.NVarChar(-1), { nullable: false });
            // table.columns.add('Public', sql.Bit, { nullable: false });

            var lines = [];
            id = body.Id || uuid();
            var public = body.Public ? 1 : 0;

            var insert = '';
            req.input('meta', sql.VarChar, meta);
            req.input('id', sql.VarChar, id);
            req.input('userId', sql.VarChar, userId);
            req.input('label', sql.VarChar, body.Label);
            req.input('public', sql.Bit, public);

            var line;
            for (var i = 0; i < body.Text.length; i += 255) {
            //     table.rows.add(
            //         id,
            //         i / 255,
            //         body.Text.substr(i, 255),
            //         body.UserId,
            //         body.Label,
            //         body.Meta,
            //         public
            //     );
                line = i / 255;
                req.input('line' + line, sql.Int, line);
                req.input('text' + line, sql.VarChar, body.Text.substr(i, 255));
                insert += 'INSERT JsonObject ( Id, Line, Text, UserId, Label, Meta, "Public" ) VALUES ' +
                    '( @id, @line' + line + ', @text' + line + ', @userId, @label, @meta, @public ); ';
            }

            // req.bulk(table, (err, result) => {
            req.query(insert, (err, result) => {
                if (err && result.rowsAffected.length && result.rowsAffected[0] > 0) {
                    console.log('saveObject.bulk', err)
                    tx.rollback().then(result => {
                        console.log('rolled back')
                        promise.reject(500, 'rollback');
                    }).catch(err => {
                        console.log('saveObject.rollback', err)
                        promise.reject(500, err);
                    });
                    return;
                }

                tx.commit().then(() => {
                    console.log('commit', id);
                    promise.resolve(id);
                }).catch(err => {
                    console.log('saveObject.commit', err)
                    tx.rollback().then(result => {
                        console.log('rolled back')
                        promise.reject(500, 'rollback');
                    }).catch(err => {
                        console.log('saveObject.rollback', err)
                        promise.reject(500, err);
                    });
                });
            });
        });
    });
    return promise;
};

var deleteObject = function(meta, id, userId) {
    var promise = deferred();
    db.query`
        DELETE JsonObject
         WHERE Meta = ${meta}
           AND Id = ${id}
           AND UserId = ${userId};
    `.then(result => {
        if (result.rowsAffected.length &&
            result.rowsAffected[0] > 0) {
            promise.resolve(id);
        } else {
            promise.reject(404);
        }
    }).catch(err => {
        console.log(err)
        promise.reject(500, err);
    });
    return promise;
};

router.get('/:meta', function(req, res) {
    if (!req.user) {
        return res.status(401).send();
    }

    var meta = req.params.meta;
    var userId = req.user.id;

    getYourObjects(meta, userId).promise(function(result) {
        res.send(JSON.stringify(result));
    }, function(status, err) {
        res.status(status).send(JSON.stringify(err));
    });
});

router.get('/:meta/public', function(req, res) {
    var meta = req.params.meta;

    getPublicObjects(meta, req.user).promise(function(result) {
        res.send(JSON.stringify(result));
    }, function(status, err) {
        res.status(status).send(JSON.stringify(err));
    });
});

router.get('/:meta/public/:userid', function(req, res) {
    var meta = req.params.meta;
    var target = req.params.userid;

    getUserObjects(meta, target, req.user).promise(function(result) {
        res.send(JSON.stringify(result));
    }, function(status, err) {
        res.status(status).send(JSON.stringify(err));
    });
});

router.get('/:meta/:id', function(req, res) {
    var meta = req.params.meta;
    var id = req.params.id;

    getJsonObject(meta, id, req.user).promise(function(result) {
        res.send(JSON.stringify(result));
    }, function(status, err) {
        res.status(status).send(JSON.stringify(err));
    });
});

var onPostPut = function(req, res) {
    if (!req.user) {
        return res.status(401).send();
    }

    if (!req.body.UserId) {
        req.body.UserId = req.user.id;
    } else if (req.user.id !== req.body.UserId) {
        return res.status(403).send();
    }

    saveObject(req.body).promise(function(result) {
        res.send(JSON.stringify(result));
    }, function(status, err) {
        res.status(status).send(JSON.stringify(err));
    });
};

var onPostPutMeta = function(req, res) {
    req.body.Meta = req.params.meta;
    onPostPut(req, res);
}

router.post('/:meta', onPostPutMeta);
router.put('/:meta', onPostPutMeta);
router.post('/', onPostPut);
router.put('/', onPostPut);

router.delete('/:meta/:id', function(req, res) {
    if (req.user === null) {
        return res.status(401).send();
    }

    var meta = req.params.meta;
    var id = req.params.id;
    var userId = req.user.id;

    deleteObject(meta, id, userId).promise(function(result) {
        res.send(JSON.stringify(result));
    }, function(status, err) {
        res.status(status).send(JSON.stringify(err));
    });
});