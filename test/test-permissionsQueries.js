var assert = require('assert');
var expect = require('expect.js');

var createInterface = require('component-registry').createInterface;
var createUtility = require('component-registry').createUtility;
var Principal = require('../lib/principals').Principal;

var elasticQuery = require('../lib/permissionsQueries/elastic');
var arangodbQuery = require('../lib/permissionsQueries/arangodb');
var mongodbQuery = require('../lib/permissionsQueries/mongodb');

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
    var queryGenerator = elasticQuery
    
    it('can be created for create', function() {        
        var query = queryGenerator(editorPrincipal, "test", "create");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
    
    it('can be created for read', function() {        
        var query = queryGenerator(editorPrincipal, "test", "read");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
    
    it('can be created for update', function() {        
        var query = queryGenerator(editorPrincipal, "test", "update");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
    
    it('can be created for delete', function() {        
        var query = queryGenerator(editorPrincipal, "test", "delete");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
});

describe('Arangodb permissions query', function() {
    var queryGenerator = arangodbQuery
    
    it('can be created for create', function() {        
        var query = queryGenerator(editorPrincipal, "test", "create");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
    
    it('can be created for read', function() {        
        var query = queryGenerator(editorPrincipal, "test", "read");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
    
    it('can be created for update', function() {        
        var query = queryGenerator(editorPrincipal, "test", "update");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
    
    it('can be created for delete', function() {        
        var query = queryGenerator(editorPrincipal, "test", "delete");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
});

describe('Mongodb permissions query', function() {
    var queryGenerator = mongodbQuery
    
    it('can be created for create', function() {        
        var query = queryGenerator(editorPrincipal, "test", "create");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
    
    it('can be created for read', function() {        
        var query = queryGenerator(editorPrincipal, "test", "read");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
    
    it('can be created for update', function() {        
        var query = queryGenerator(editorPrincipal, "test", "update");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
    
    it('can be created for delete', function() {        
        var query = queryGenerator(editorPrincipal, "test", "delete");
        // console.log(JSON.stringify(query));
        expect(query).to.not.be(undefined);
    });
});