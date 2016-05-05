'use strict';

var exportAllFrom = function (requiredModule) {
    for (var key in requiredModule) {
        module.exports[key] = requiredModule[key];
    }    
};
exportAllFrom(require('./principals'));
exportAllFrom(require('./permissions'));

require('./permissionsQueries/mongodb');
require('./permissionsQueries/elastic');