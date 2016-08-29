/*
 * Copyright 2016 Hewlett Packard Enterprise Development Company, L.P.
 *
 * Licensed under the MIT License (the "License"); you may not use this project except in compliance with the License.
 */

define([
	'js-whatever/js/base-page',
	'text!find/idol/templates/newpage.html'
], function(BasePage, template) {

	return BasePage.extend({
		template: _.template(template),

		initialize: function(options) {
			this.options = options;

			this.options.icon = this.options.icon || 'fa fa-cog';
		},

		render: function() {
			this.$el.html(this.template(this.options));
		}
	});
});
