'use strict';
var registry = require('protoncms-core').registry;
var createUtility = require('component-registry').createUtility;

var mquery = require('mquery');

var IRootPrincipal = require('protoncms-core').interfaces.IRootPrincipal;
var IDataServicePermissionsQuery = require('protoncms-core').interfaces.IDataServicePermissionsQuery;
var IWorkflowLookup = require('protoncms-core').interfaces.IWorkflowLookup;

var getQuery = function (principal, collection, action) {
    // TODO: Move this to package protoncms-permissions
    if (principal && IRootPrincipal.providedBy(principal)) {
        // Root can do ANYTHING!
        return {"match_all": {}};
    }
    
    // TODO: Check if we passed a valid action...
    
    var permissionsRole = principal.permissions();
    
    var tmpOwnerPermission = {
        term: {}
    };
    tmpOwnerPermission.term['_permissions.' + action] = 'owner';
    
    var tmpRolePermission = {
        term: {}
    };
    tmpRolePermission.term['_permissions.' + action] = permissionsRole;
    
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
            
            var tmpStateQ = {
                term: {}
            };
            tmpStateQ.term['_workflows.' + statePropName + '.state'] = state;
            
            var tmpPermissionQ = {
                term: {}
            };
            tmpPermissionQ.term['_permissions.' + action] = role + ':' + statePropName + '.' + state;
            
            return {
                and: [ tmpStateQ, tmpPermissionQ ]
            }
        });
        
        // If prop doesn't exist it doesn't have this workflow so the query should return true
        // if it does it depends on the permissions query so: !exist || queryMatch
        var tmpCheckExists = {
            exists: {}
        };
        tmpCheckExists.exists['field'] = '_workflows.' + statePropName;
        return {
            or: [
                { not: tmpCheckExists },
                { or: permissionQuery }
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
    
    var outp = {
        or: [
            // First check ownership
            { 
                // principal is owner and owner may view
                and: [
                    tmpOwnerPermission, {
                        term: {
                            "_permissions.owners": principal._principalId
                        }
                    }]
            },
            // Then check if there are general role permissions 
            tmpRolePermission
        ]
    }
    // Then check workflow related role permissions (all need to be fullfilled)
    // if any workflows were found
    if (utils.length > 0) {
        outp['or'].push(
            { and: tmpWorkflowPermissions }
        )
    }
    
    return outp;
}
module.exports = getQuery;

var query = createUtility({
    implements: IDataServicePermissionsQuery,
    name: 'elastic',
    getQuery: getQuery
});
registry.registerUtility(query);
