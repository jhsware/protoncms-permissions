'use strict';
var registry = require('protoncms-core').registry;
var createUtility = require('component-registry').createUtility;

var qb = require('aqb');

var IRootPrincipal = require('protoncms-core').interfaces.IRootPrincipal;
var IDataServicePermissionsQuery = require('protoncms-core').interfaces.IDataServicePermissionsQuery;
var IWorkflowLookup = require('protoncms-core').interfaces.IWorkflowLookup;

var getQuery = function (principal, collectionName, action) {
    // TODO: Move this to package protoncms-permissions
    if (principal && IRootPrincipal.providedBy(principal)) {
        // Root can do ANYTHING!
        return true
    }
    
    // TODO: Check if we passed a valid action...
    
    var permissionsRole = principal.permissions();
    
    var qbOwnerPermission = qb.in(qb.str('owner'), 'obj._permissions.' + action)
    
    var qbRolePermission = qb.in(qb.str(permissionsRole), 'obj._permissions.' + action)
    
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
        
        var permissionQueries = states.map(function (state) {
                        
            var qbStateQ = qb.eq('obj._workflows.' + statePropName + '.state', qb.str(state));
            
            var qbPermissionQ = qb.in(qb.str(role + ':' + statePropName + '.' + state), 'obj._permissions.' + action);
            
            return qb.and(qbStateQ, qbPermissionQ)
        });
        
        // If prop doesn't exist it doesn't have this workflow so the query should return true
        // if it does it depends on the permissions query so: !exist || queryMatch
        var qbNotCheckExists = qb.eq('obj._workflows.' + statePropName, undefined);
        
        return qb.or(
            qbNotCheckExists,
            qb.or.apply(qb, permissionQueries)
        )
    }

    // Add the workflow permission queries
    var utils = registry.getUtilities(IWorkflowLookup)
    var tmpWorkflowPermissions = utils.map(function (util) {
        var intrfc = util.getInterface();
        return createWorkflowPermissionQuery(permissionsRole, action, intrfc);
    });
    
    // NOTE: We need the obj var set in the calling function
    var outpQ = qb.or(
        // First check ownership
        qb.and(
            qbOwnerPermission,
            // principalId is used to mark is owner
            qb.in(qb.str(principal._principalId), 'obj._permissions.owners')
        ),
        // Then check if there are general role permissions
        qbRolePermission,
        qb.and.apply(qb, tmpWorkflowPermissions)
    )
    
    return outpQ
};
module.exports = getQuery;

var query = createUtility({
    implements: IDataServicePermissionsQuery,
    name: 'arangodb',
    getQuery: getQuery
});
registry.registerUtility(query);
