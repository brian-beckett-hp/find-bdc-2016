/*
 * Copyright 2015 Hewlett-Packard Development Company, L.P.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */

define([
	'jquery',
	'underscore',
	'backbone',
	'text!find/templates/app/page/search/filters/parametric/fieldtext-toggle.html'
], function ($, _, Backbone, template) {
	'use strict';

	return Backbone.View.extend({
		template: _.template(template)(),

		initialize: function (options) {
			this.queryModel = options.queryModel;
			this.queryState = options.queryState;

			this.toggleModel = new Backbone.Model({
				field: '/DOCUMENT/AUTHOR',
				value: 'SIMONA'
			})

			this.enabled = false;
		},

		render: function() {
			this.$el.html(this.template)
		},

		events: {
			'click .toggleFieldtext': 'toggle'
		},

		toggle: function() {
			console.log("Input was clicked");
			
			if (this.enabled) {
				this.queryState.selectedParametricValues.remove(this.toggleModel)
			} else {
				this.queryState.selectedParametricValues.add(this.toggleModel)
			}

			this.enabled = !this.enabled;
		}
	});

});
