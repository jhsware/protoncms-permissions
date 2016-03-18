'use strict';
var registry = require('protoncms-core').registry;
var createUtility = require('component-registry').createUtility;

var mquery = require('mquery');

var IRootPrincipal = require('protoncms-core').interfaces.IRootPrincipal;
var IDataServicePermissionsQuery = require('protoncms-core').interfaces.IDataServicePermissionsQuery;
var IWorkflowLookup = require('protoncms-core').interfaces.IWorkflowLookup;

var query = createUtility({
    implements: IDataServicePermissionsQuery,
    name: 'mongodb',
    getQuery: function (principal, collection, action) {
        // TODO: Move this to package protoncms-permissions
        if (principal && IRootPrincipal.providedBy(principal)) {
            // Root can do ANYTHING!
            return mquery(collection).toConstructor();
        }
        
        // TODO: Check if we passed a valid action...
        
        var permissionsRole = principal.permissions();
        
        var tmpOwnerPermission = {};
        tmpOwnerPermission['_permissions.' + action] = {
            $all: ['owner']
        };
        
        var tmpRolePermission = {};
        tmpRolePermission['_permissions.' + action] = {
            $all: [permissionsRole]
        };
        
        var createWorkflowPermissionQuery = function (role, action, workflowInterface) {
            /*
            Example of test for workflow permissions
            (
                obj._workflows.userWorkflow && (
                    (obj._workflows.userWorkflow == 'inactive' && role + ':userWorkflow.inactive') ||
                    (obj._workflows.userWorkflow == 'active' && role + ':userWorkflow.active') ||
                    (obj._workflows.userWorkflow == 'trash' && role + ':userWorkflow.trash')
                )
            ) && (
                obj._workflows.publishWorkflow && (
                    (obj._workflows.publishWorkflow == 'draft' && role + ':publishWorkflow.draft') ||
                    (obj._workflows.publishWorkflow == 'published' && role + ':publishWorkflow.published') ||
                    (obj._workflows.publishWorkflow == 'trash' && role + ':publishWorkflow.trash')
            )
            */  
            var statePropName = workflowInterface.schema.statePropName;
            var states = Object.keys(workflowInterface.schema.states);
            
            var permissionQuery = states.map(function (state) {
                
                var tmpStateQ = {};
                tmpStateQ['_workflows.' + statePropName + '.state'] = state;
                
                var tmpPermissionQ = {};
                tmpPermissionQ['_permissions.' + action] = { $all: [role + ':' + statePropName + '.' + state] };
                
                return {
                    $and: [ tmpStateQ, tmpPermissionQ ]
                }
            });
            
            // If prop doesn't exist it doesn't have this workflow so the query should return true
            // if it does it depends on the permissions query so: !exist || queryMatch
            var tmpCheckExists = {};
            tmpCheckExists['_workflows.' + statePropName] = { $exists: false };
            return {
                $or: [
                    tmpCheckExists,
                    { $or: permissionQuery }
                ]
            }
        }
        
        var tmpWorkflowPermissions = [];

        // Add the workflow permission queries
        var utils = registry.getUtilities(IWorkflowLookup)
        utils.map(function (util) {
            var intrfc = util.getInterface();
            tmpWorkflowPermissions.push(createWorkflowPermissionQuery(permissionsRole, action, intrfc));
        });
        
        return mquery(collection)
            .where().or([
                // First check ownership
                { 
                    // principal is owner and owner may view
                    $and: [
                        tmpOwnerPermission, {
                            "_permissions.owners": {
                                $all: [principal._principalId]
                            }
                        }]
                },
                // Then check if there are general role permissions 
                tmpRolePermission,
                // Then check workflow related role permissions (all need to be fullfilled)
                { $and: tmpWorkflowPermissions }
            ])
            .toConstructor();
    }
});
registry.registerUtility(query);
