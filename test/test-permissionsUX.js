var assert = require('assert');
var expect = require('expect.js');

var registry = require('protoncms-core').registry;
var _ = require('lodash');

var createUtility = require('component-registry').createUtility;
var Principal = require('../lib/principals').Principal;

var IPermissions = require('protoncms-core').interfaces.IPermissions;

var hasUXPermission = require('../lib/index').hasUXPermission;
var permissionsUtilityBase = require('../lib/index').permissionsUtilityBase;

var editorPrincipal = new Principal({
    principalId: "testEditor",
    role: "editor"
});

var writerPrincipal = new Principal({
    principalId: "testWriter",
    role: "writer"
});

describe('UX Permissions', function() {
    
    var permissionUtility
    
    it('can be created ', function() {
        
        var _permissionChecks = {
            create:     function (user, obj) {
                if (obj && user.role === 'editor') {
                    return (obj.data !== "editor_may_not_edit_this_one")
                } else {
                    return hasUXPermission(user, ['admin', 'editor']); 
                } 
                
            },
            read:       function (user, obj) {  return hasUXPermission(user, ['admin', 'editor', 'writer']); },
            list:       function (user, obj) {  return hasUXPermission(user, ['admin', 'editor', 'writer']); },
            update:     function (user, obj) {  return hasUXPermission(user, ['admin', 'editor', 'writer']); }
        }

        var permissionsDict = {
            implements: IPermissions,
            name: 'User',
    
            _permissionChecks: _permissionChecks,    
        };
        // Add the permissionsUtilityBase methods to this utility
        _.extend(permissionsDict, permissionsUtilityBase)
        // ...and register it
        registry.registerUtility(createUtility(permissionsDict));
        
        var uxPermissionUtil = registry.getUtility(IPermissions, 'User')
        
        expect(uxPermissionUtil).to.not.be(undefined);
    });
    
    it('can be used', function() {        
        permissionUtility = registry.getUtility(IPermissions, 'User');
        permissionUtility.permissionsUsed('User.EditForm', [ // Just a good name for debugging
            'create',
            'update',
        ]);
        expect(permissionUtility).to.not.be(undefined);
    });
    
    it('can be queried for exisiting permissions without object', function() {        
        var permission = permissionUtility.user(editorPrincipal).may('create').this()
        expect(permission).to.equal(true);
        
        var permission = permissionUtility.user(editorPrincipal).may('update').this()
        expect(permission).to.equal(true);
    });
    
    it('can be queried with object', function() {
        var tmpObj = {
            data: "editor_may_not_edit_this_one" // Just some fake content
        }
        var permission = permissionUtility.user(editorPrincipal).may('create').this(tmpObj)
        
        expect(permission).to.equal(false);
    });
    
    it('raises error when querying non-existant permissions', function() {                
        try {
            var permission = permissionUtility.user(editorPrincipal).may('delete').this()
            var success = true
        } catch (e) {
            var success = false
        }
        expect(success).to.equal(false);
    });
    
});
