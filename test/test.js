var assert = require('assert');
var expect = require('expect.js');

var createInterface = require('component-registry').createInterface;
var createUtility = require('component-registry').createUtility;
var Principal = require('../lib/principals').Principal;

var elasticQuery = require('../lib/permissionsQueries/elastic');

var IWorkflowLookup = require('protoncms-core').interfaces.IWorkflowLookup;

var IPublishWorkflow = createInterface({
    // Interface for PublishWorkflow
    name: 'IPublishWorkflow',
    
    schema: {
        statePropName: 'publishWorkflow',
    
        defaultState: 'draft',
    
        states: {
            draft: {title: 'Utkast'},
            published: {title: 'Publicerad'},
            trash: {title: 'Papperskorg'}
        }        
    }
});

var PublishWorkflowLookup = createUtility({
    implements: IWorkflowLookup,
    name: 'PublishWorkflow',
    
    getInterface: function () {return IPublishWorkflow}
});
registry.registerUtility(PublishWorkflowLookup);

var editorPrincipal = new Principal({
    principalId: "testEditor",
    role: "editor"
});

describe('Elasticsearch permissions query', function() {
    it('can be created', function() {        
        var query = elasticQuery(editorPrincipal, "test", "create");
        
        console.log(JSON.stringify(query));
        
        expect(query).to.not.be(undefined);
    });
});