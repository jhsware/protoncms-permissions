'use strict';
var registry = require('protoncms-core').registry;

var createUtility = require('component-registry').createUtility;
var createObjectPrototype = require('component-registry').createObjectPrototype;

var IPrincipal = require('protoncms-core').interfaces.IPrincipal;
var IRootPrincipal = require('protoncms-core').interfaces.IRootPrincipal;
var IAnonymousPrincipal = require('protoncms-core').interfaces.IAnonymousPrincipal;
var IObjectPrototypeFactory = require('protoncms-core').interfaces.IObjectPrototypeFactory;

var Principal = createObjectPrototype({
    implements: [IPrincipal],
    
    constructor: function (params) {
        this._principalId = params.principalId;
                
        if (params.principalId) {
            delete params.principalId
        }
    },
    
    permissions: function () {
        return this.role;
    }
});

module.exports.Principal = Principal;

// The root principal is used to do really deep shit! 
var RootPrincipal = createObjectPrototype({
    implements: [IRootPrincipal, IPrincipal],
    
    constructor: function () {
        this._principalId = "root";
        this._id = "root";
        this._type = "RootPrincipal";
    },
    
    permissions: function () {
        return 'admin';
    }
});

var RootPrototypeFactory = createUtility({
    implements: IObjectPrototypeFactory,
    name: 'RootPrincipal',
    
    getPrototype: function () {
        return RootPrincipal;
    },
    
    getObject: function () {
        return new RootPrincipal();
    }
});
registry.registerUtility(RootPrototypeFactory);

// The anonymous principal is used to do do public access for none logged in users
var AnonymousPrincipal = createObjectPrototype({
    implements: [IAnonymousPrincipal, IPrincipal],
    
    constructor: function () {
        this._principalId = "anonymous";
        this._id = "anonymous";
        this._type = "AnonymousPrincipal";
    },
    
    permissions: function () {
        return 'anonymous';
    }
});

var AnonymousPrototypeFactory = createUtility({
    implements: IObjectPrototypeFactory,
    name: 'AnonymousPrincipal',
    
    getPrototype: function () {
        return AnonymousPrincipal;
    },
    
    getObject: function () {
        return new AnonymousPrincipal();
    }
});
registry.registerUtility(AnonymousPrototypeFactory);
