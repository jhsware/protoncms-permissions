'use strict';
var registry = require('protoncms-core').registry;
var _ = require('lodash');

var createUtility = require('component-registry').createUtility;
var createObjectPrototype = require('component-registry').createObjectPrototype;

var IPermissions = require('protoncms-core').interfaces.IPermissions;

/*
    hasUXPermission

    Sample usage:

    if (ip.user(currentUser).may('view').this(obj)) {
        // Then do stuff
    }

*/

var permissionsUtilityBase = {
    /*
        this.permissionsUsed("Component.Name", [
            'create',
            'update'
        ]);
        this.user(currentUser).may('update').this(obj);
    */
    
    permissionsUsed: function (name, permissions) {
        this._debugName = name
        permissions.forEach(function (permissionName) {
            if (!this._permissionChecks.hasOwnProperty(permissionName)) {
                console.warn("[PERMISSIONS] WARN! The component [" + name + "] uses permission '" + permissionName + "' but it is not registered in (IPermission, '" + this._name + "')");
            }
        }.bind(this))
    },
    
    user: function (user) {
        return {
            may: mayFuncs(this, user)
        }
    }
};
module.exports.permissionsUtilityBase = permissionsUtilityBase;

var mayFuncs = function (self, user) {
    return function (permissionName) {
        return {
            this: thisFuncs(self, user, permissionName)
        }
    }
};

var thisFuncs = function (self, user, permissionName) {
    return function (obj) {
        if (typeof self._permissionChecks[permissionName] === 'function') {
            return self._permissionChecks[permissionName](user, obj);
        } else {
            throw "[PERMISSIONS] WARN! The component [" + self._debugName + "] uses permission '" + permissionName + "' but it is not registered in (IPermission, '" + self._name + "')"
        }
    }
};

var hasUXPermission = function (user, roles) {
    // Did we get a user at all?
    if (typeof user === 'undefined' || user === null) {
        return false;
    }
    
    // If we got a user, check the permissions property
    var role = typeof user.permissions === 'function' ? user.permissions() : user.permissions;
    return roles.indexOf(role) >= 0;
}
module.exports.hasUXPermission = hasUXPermission;

var _permissionChecks = {
    create:     function (user, obj) {  return hasUXPermission(user, ['admin']); },
    read:       function (user, obj) {  return hasUXPermission(user, ['admin']); },
    list:       function (user, obj) {  return hasUXPermission(user, ['admin']); },
    update:     function (user, obj) {  return hasUXPermission(user, ['admin']); }
}

var permissionsDict = {
    implements: IPermissions,
    name: 'ProtonObject',
    
    _permissionChecks: _permissionChecks,    
};
// Add the permissionsUtilityBase methods to this utility
_.extend(permissionsDict, permissionsUtilityBase)
// ...and register it
registry.registerUtility(createUtility(permissionsDict));

var Permissions = createObjectPrototype({
    implements: [IPermissions],
    
    constructor: function (params, permissions) {
        // We want to throw an error if no permissions are passed
        
        // Make sure we can't mess up permissions by passing weird stuff that overrides general settings
        if (params && params.hasOwnProperty('_permissions')) {
            delete params._permissions;
        };
        
        this._permissions = {
            owners: permissions.owners,
            create: permissions.mayCreate,
            read:   permissions.mayRead,
            update: permissions.mayUpdate,
            delete: permissions.mayDelete
        };
    }
});

module.exports.Permissions = Permissions;