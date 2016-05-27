# protoncms-permissions

Role based data access permissions that obey workflow state. 

Role based UX permissions to determine if react components should be rendered.

### Defining Data Access Permissions

This is a typical implementation of permissions. The Permissions object allows you to set basic data access permissions:

    // The standard base object:
    var ProtonObject = require('protoncms-core').components.ProtonObject;
    // Permissions cababilities:
    var Permissions = require('protoncms-permissions').Permissions;
    // Your custom object interface:
    var IBlogPost = require('interfaces').IBlogPost;
    // A custom workflow for this object:
    var PublishWorkflow = require('../workflows/PublishWorkflow').PublishWorkflow;
    
    
    var BlogPost = createObjectPrototype({
        implements: [IBlogPost],
        extends: [ProtonObject, Permissions, PublishWorkflow],
    
        constructor: function (params) {
        
            this._IPermissions.constructor.call(this, params, {
                owners: (params && params._permissions && params._permissions.owners) || [],
                mayCreate: ['admin', 'editor', 'writer'],
                mayRead: ['owner', 'admin', 'editor', 'writer:publishWorkflow.published', 'anonymous:publishWorkflow.published'],
                mayUpdate: ['owner', 'admin', 'editor'],
                mayDelete: ['owner', 'admin', 'editor']
            });
            
            this._IPublishWorkflow.constructor.call(this, {});
        
            this._type = 'BlogPost';
        }
    })    

You can define CRUD-permissions and also make them dependent on workflow states if you have extended a workflow object. The permissions are pretty intuitive.

    owners: (params && params._permissions && params._permissions.owners) || [],

Sets the owner of the object. This is normally added by the server during persistence rather than the client so we just set what ever is passed when objects are deserialized on loading.

    mayCreate: ['admin', 'editor', 'writer'],

Just simple role based permissions. Any principal with the property role set to either of these strings can create the object.

     mayRead: ['owner', 'admin', 'editor', 'writer:publishWorkflow.published', 'anonymous:publishWorkflow.published'],

Now we have added workflow state dependent permissions for users with role writer and special user anonymous.

    writer              -- user role
    :publishWorkflow    -- workflow
    .published          -- state

Ie a user with the role "writer" can read this object only if the workflow state of "publishWorkflow" is set to "published". The same condition applies to the special user "anonymous", which is an unauthenticated user.

The available user types are:

    root                -- can do anything and is only available programatically on the server in production, or through login during development root:password
    anonymous           -- an unauthenticated user
    admin|editor|...    -- an authenticated user with given role (the user object on the server used to determine role can't be manipulated by the client)

If you want permissions for several states you need to add more workflow state dependent permissions to the operation. You can't use wildcards etc.

### Using permissions in the API

When inserting the object to the datastore you need to add an owner. Something like this:

    if (!IRootPrincipal.providedBy(principal) && data.hasOwnProperty('_permissions')) {
        if (data._permissions.owners.indexOf(principal._principalId) < 0) {
            data._permissions.owners.push(principal._principalId);
        }
        if (data._permissions.create.indexOf(principal.permissions()) < 0) {
            return callback("You don't have permission to create this object");
        };
    }

The reason we don't add root as an owner is because root can do anything anyway.

In order to add permission filter to your queries you just get the IDataServicePermissionsQuery utility for your specified datastore and request a query object: 

    var IDataServicePermissionsQuery = require('protoncms-core').interfaces.IDataServicePermissionsQuery;
    var dataServicePermissionsQuery = registry.getUtility(IDataServicePermissionsQuery, 'mongodb');
    var permissionQuery = dataServicePermissionsQuery.getQuery(principal, collection, actions.READ);

This object should then be combined with a custom query using an and operator. The actual implementation depends on your data store.

    ie. permissionsQuery && customQuery

Where permissionsQuery is provided by protoncms-permissions and customQuery is whatever application specific query you want to perform.

NOTE: The principal should be the current session user stored on the server, not passed by the client to avoid manipulation of role etc.

#### mongodb

    var dataServicePermissionsQuery = registry.getUtility(IDataServicePermissionsQuery, 'mongodb');
    var permissionQuery = dataServicePermissionsQuery.getQuery(principal, collection, actions.READ);
    
    permissionQuery()
        .where('_id').equals(mongoObjId)
        .findOneAndUpdate(data)
        .then(...)

The permissions is enforced during update by performing a find and then updating the matched document. The permissionQuery is an mquery style query object.

### arangodb

    var dataServicePermissionsQuery = registry.getUtility(IDataServicePermissionsQuery, 'arangodb');
    var qbPermissionQuery = dataServicePermissionsQuery.getQuery(principal, collectionName, actions.READ);            
    
    //console.log("****** DO UPDATE ******");
    db.query(qb.for('obj').in(collectionName).filter(
        qb.and(
            qb.eq('obj._key', qb.str(docId)),
            qbPermissionQuery
        )
    ).return('obj'))
        .then(...)

### elasticsearch

    var theQuery = {
       "query": {
           "filtered": {}
       },
        "from" : 0, 
        "size" : 25,
    }
    
    // Add permissions query
    var dataServicePermissionsQuery = registry.getUtility(IDataServicePermissionsQuery, 'elastic')
    var permissionQuery = dataServicePermissionsQuery.getQuery(principal, undefined, actions.READ)
    theQuery.query.filtered['filter'] = permissionQuery

When using Elasticsearch we want to add the permissions query as a filter so it doesn't affect the score of whatever custom query we are performing.

### Creating Principals (Users)

A principal is an authenticated identity containing a principalId what is used to determine ownership, createdBy and modifiedBy property values.

    // The standard base object:
    var ProtonObject = require('protoncms-core').components.ProtonObject;
    // Your custom user object interface:
    var IUser = require('interfaces').IUser;
    // The base principal object
    var Principal = require('protoncms-permissions').Principal;
    // The base permissions object (users should also have access permissions set):
    var Permissions = require('protoncms-permissions').Permissions;
    // A custom user workflow (you could use the same as other objects):
    var UserWorkflow = require('../workflows/UserWorkflow').UserWorkflow;
    
    var User = createObjectPrototype({
        implements: [IUser],
        extends: [ProtonObject, Principal, Permissions, UserWorkflow],
    
        constructor: function (params) {
        
            this._IPrincipal.constructor.call(this, {
                principalId: params && (params._principalId || this._id)
            });
        
            this._IPermissions.constructor.call(this, params, {
                owners: (params && params._permissions && params._permissions.owners) || [],
                mayCreate: ['admin'],
                mayRead: ['owner', 'admin', 'editor:userWorkflow.active'],
                mayUpdate: ['owner', 'admin'],
                mayDelete: ['admin']
            });
        
            this._IUserWorkflow.constructor.call(this, {});
        
            this._type = 'User';
        }
    })

The custom interface usually contains the role property to allow us to change roles when editing a user.

## UX Permissions

UX permissions allow us to restrict what React components we are allowed to render based on user role. This allows us to restrict views to avoid presenting UX elements that a user can't interact with anyway.

### Define permissions

    var IPermissions = require('protoncms-core').interfaces.IPermissions;
    
    var permissionsUtilityBase = require('protoncms-permissions').permissionsUtilityBase;
    
    var hasUXPermission = require('protoncms-permissions').hasUXPermission;
    
    var _permissionChecks = {
        create:     function (user, obj) {  return hasUXPermission(user, ['admin', 'editor']); },
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

Unlike data access permissions, the UX permissions are only role aware. The obvious reason is that a view can't have a workflow state.

### Use UX Permissions With A Component

    // Initialize the permissions system for this component
    var IPermissions = require('protoncms-core').interfaces.IPermissions;
    var permissionUtility = registry.getUtility(IPermissions, 'Media');
    permissionUtility.permissionsUsed('Media.EditForm', [ // Just a good name for debugging
        'create',
        'update',
    ]);
    
    React.createClass({
        
        mixins: [PagePermissionsMixin],
    
        permissions: permissionUtility,
        
        ...
        
    })

We initialize the permissionUtility if we can already when the code is loaded. This way we can get a warning on startup if we have forgotten to define a permission that is used for this component.

If the component doesn't know what type of permissions it requires until at runtime we can set this.permissions in this.getInitialState.



