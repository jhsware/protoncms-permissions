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
    
    var permissionsRole = principal.permissions()
    
    var tmpActionOwner = {"match": {}}
    tmpActionOwner.match['_permissions.' + action] = 'owner'
    var theOwnerPermission = {
        "nested": {
            "path": "_permissions",
            "filter": {
                "bool": {
                    "must": [
                        { "match": {"_permissions.owners": principal._principalId} },
                        tmpActionOwner
                    ]
                }
            }
        }
    }
    
    var theRolePermission = {
        "nested": {
            "path": "_permissions",
            "filter": {
                "bool": {
                    "must": { 
                        "match": {
                            // Dynamically calculated key...
                        } 
                    }

                }
            }
        }
    }
    theRolePermission.nested.filter.bool.must.match['_permissions.' + action] = permissionsRole;
    
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

            /*
        
            Working check for workflow
            
                {
                    "and": [
                        {
                            "nested": {
                                "path": "_workflows.publishWorkflow",
                                "filter": {
                                    "bool": {
                                        "must": {
                                            "match": {
                                                "_workflows.publishWorkflow.state": "published"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        
                      {
                        "nested": {
                          "path": "_permissions",
                          "query": {
                            "bool": {
                              "must": {
                                "match": {
                                  "_permissions.read": "writer:publishWorkflow.published"
                                }
                              }
                            }
                          }
                        }
                      }
                    ]
                }:
        
        
            */
            
            var tmpStateQ = {
                "and": [
                    {
                        "nested": {
                            "path": '_workflows.' + statePropName,
                            "filter": {
                                "bool": {
                                    "must": {
                                        "match": {
                                            // Add programmatically because key is calculated
                                        }
                                    }
                                }
                            }
                        }
                    },
                    
                    {
                        "nested": {
                            "path": "_permissions",
                            "filter": {
                                "bool": {
                                    "must": {
                                        "match": {
                                            // Add programmatically because key is calculated
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            };
            tmpStateQ.and[0].nested.filter.bool.must.match['_workflows.' + statePropName + '.state'] = state;
            tmpStateQ.and[1].nested.filter.bool.must.match['_permissions.' + action] = role + ':' + statePropName + '.' + state;
            
            return tmpStateQ
        });
        
        // If prop doesn't exist it doesn't have this workflow so the query should return true
        // if it does it depends on the permissions query so: !exist || queryMatch
        /*
        
        Working check for exists:
        
            {
                "not": {
                    "nested": {
                        "path": "_workflows.publishWorkflow",
                        "filter": {
                            "bool": {
                                "must": {
                                    "exists": {
                                        "field": "_workflows.publishWorkflow.state"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        
        */
        
        var tmpCheckExists = {
                "not": {
                    "nested": {
                        "path": "_workflows." + statePropName,
                        "filter": {
                            "bool": {
                                "must": {
                                    "exists": {
                                        "field": "_workflows." + statePropName + ".state"
                                    }
                                }
                            }
                        }
                    }
                }
        };
        // Add exist check first
        permissionQuery.unshift(tmpCheckExists)
        return {
            or: permissionQuery
        }
    }

    // Add the workflow permission queries
    var utils = registry.getUtilities(IWorkflowLookup)
    var theWorkflowPermissions = utils.map(function (util) {
        var intrfc = util.getInterface()
        return createWorkflowPermissionQuery(permissionsRole, action, intrfc)
    });
    
    var outp = {
        or: [
            // If ownership, OR
            theOwnerPermission,
            // If we match general (not workflow state dependent) role permissions, OR
            theRolePermission
        ]
    }
    // If we match workflow state dependent role permissions
    if (utils.length > 0) {
        outp.or.push(
            { and: theWorkflowPermissions }
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
