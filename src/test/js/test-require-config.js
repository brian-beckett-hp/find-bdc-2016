/*
 * Copyright 2014-2015 Hewlett-Packard Development Company, L.P.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */

require.config({
    baseUrl: 'src/main/webapp/static/js',
    map: {
        '*': {
            'find/lib/backbone/backbone-extensions': 'backbone'
        }
    }
});
