/*
 * Copyright 2015 Hewlett-Packard Development Company, L.P.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */

define([
    'backbone',
    'jquery',
    'underscore',
    'moment',
    'find/app/model/dates-filter-model',
    'find/app/model/entity-collection',
    'find/app/model/query-model',
    'find/app/model/saved-searches/saved-search-model',
    'find/app/model/parametric-collection',
    'find/app/model/parametric-fields-collection',
    'find/app/model/numeric-parametric-fields-collection',
    'find/app/page/search/results/query-strategy',
    'find/app/page/search/results/state-token-strategy',
    'find/app/util/results-view-container',
    'find/app/util/results-view-selection',
    'find/app/page/search/related-concepts/related-concepts-view',
    'find/app/util/model-any-changed-attribute-listener',
    'find/app/page/search/saved-searches/saved-search-control-view',
    'find/app/page/search/results/entity-topic-map-view',
    'find/app/page/search/results/sunburst-view',
    'find/app/page/search/results/map-results-view',
    'find/app/page/search/results/table/table-view',
    'find/app/page/search/time-bar-view',
    'find/app/configuration',
    'parametric-refinement/prettify-field-name',
    'i18n!find/nls/bundle',
    'text!find/templates/app/page/search/service-view.html'
], function(Backbone, $, _, moment, DatesFilterModel, EntityCollection, QueryModel, SavedSearchModel, ParametricCollection, 
            ParametricFieldsCollection, NumericParametricFieldsCollection, queryStrategy, stateTokenStrategy, ResultsViewContainer, ResultsViewSelection,
            RelatedConceptsView, addChangeListener, SavedSearchControlView, TopicMapView, SunburstView,
            MapResultsView, TableView, TimeBarView, configuration, prettifyFieldName, i18n, templateString) {

    'use strict';

    var $window = $(window);
    var template = _.template(templateString);

    function updateScrollParameters() {
        if (this.$middleContainerContents) {
            this.middleColumnScrollModel.set({
                innerHeight: this.$middleContainerContents.innerHeight(),
                scrollTop: this.$middleContainerContents.scrollTop(),
                scrollHeight: this.$middleContainerContents.prop('scrollHeight'),
                top: this.$middleContainerContents.get(0).getBoundingClientRect().top,
                bottom: this.$middleContainerContents.get(0).getBoundingClientRect().bottom
            });
        }
    }

    return Backbone.View.extend({
        // Can be overridden
        headerControlsHtml: '',
        displayDependentParametricViews: true,

        getSavedSearchControlViewOptions: function() {
            return {};
        },

        // Abstract
        ResultsView: null,
        ResultsViewAugmentation: null,
        fetchParametricFields: null,
        fetchParametricValues: null,

        timeBarView: null,

        initialize: function(options) {
            var hasBiRole = configuration().hasBiRole;

            this.indexesCollection = options.indexesCollection;
            this.selectedTabModel = options.selectedTabModel;
            this.savedSearchCollection = options.savedSearchCollection;
            this.savedSearchModel = options.savedSearchModel;
            this.queryState = options.queryState;
            this.documentsCollection = options.documentsCollection;
            this.searchTypes = options.searchTypes;
            this.searchCollections = options.searchCollections;

            this.entityCollection = new EntityCollection([], {
                getSelectedRelatedConcepts: function() {
                    return _.flatten(this.queryState.queryTextModel.get('relatedConcepts')).concat([this.queryState.queryTextModel.get('inputText')]);
                }.bind(this)
            });

            var searchType = this.savedSearchModel.get('type');

            this.queryModel = new QueryModel({
                autoCorrect: this.searchTypes[searchType].autoCorrect,
                stateMatchIds: this.savedSearchModel.get('queryStateTokens'),
                promotionsStateMatchIds: this.savedSearchModel.get('promotionsStateTokens')
            }, {queryState: this.queryState});

            this.listenTo(this.queryModel, 'change:indexes', function() {
                this.queryState.selectedParametricValues.reset();
            });

            this.listenTo(this.savedSearchModel, 'refresh', function() {
                this.queryModel.trigger('refresh');
            });

            // There are 2 conditions where we want to reset the date we last fetched new docs on the date filter model

            // Either:
            //      We have a change in the query model that is not related to the date filters
            this.listenTo(this.queryModel, 'change', function(model) {
                if (!_.has(model.changed, 'minDate') && !_.has(model.changed, 'maxDate')) {
                    this.queryState.datesFilterModel.resetDateLastFetched();
                }
            });

            // Or:
            //      We have a change in the selected date filter (but not to NEW or from NEW to null)
            this.listenTo(this.queryState.datesFilterModel, 'change:dateRange', function(model, value) {
                var changeToNewDocFilter = value === DatesFilterModel.DateRange.NEW;
                var removeNewDocFilter = !value && model.previous('dateRange') === DatesFilterModel.DateRange.NEW;

                if (!changeToNewDocFilter && !removeNewDocFilter) {
                    this.queryState.datesFilterModel.resetDateLastFetched();
                }
            });

            // If the saved search is unmodified and not new, update the last fetched date
            this.listenTo(this.documentsCollection, 'sync', function() {
                var changed = this.queryState ? !this.savedSearchModel.equalsQueryState(this.queryState) : false;

                if (!changed && !this.savedSearchModel.isNew()) {
                    this.savedSearchModel.save({dateDocsLastFetched: moment()});
                }
            });

            this.parametricFieldsCollection = new ParametricFieldsCollection([]);
            this.restrictedParametricCollection = new ParametricCollection([], {url: '../api/public/parametric/restricted'});
            this.numericParametricFieldsCollection = new NumericParametricFieldsCollection([], {dataType: 'numeric'});
            this.dateParametricFieldsCollection = new NumericParametricFieldsCollection([], {dataType: 'date'});
            this.parametricCollection = new ParametricCollection([], {url: '../api/public/parametric'});

            // Tracks the document model which is currently shown in the preview
            this.previewModeModel = new Backbone.Model({document: null});
            
            var subViewArguments = {
                indexesCollection: this.indexesCollection,
                entityCollection: this.entityCollection,
                savedSearchModel: this.savedSearchModel,
                savedSearchCollection: this.savedSearchCollection,
                documentsCollection: this.documentsCollection,
                selectedTabModel: this.selectedTabModel,
                parametricCollection: this.parametricCollection,
                restrictedParametricCollection: this.restrictedParametricCollection,                
                parametricFieldsCollection: this.parametricFieldsCollection,
                numericParametricFieldsCollection: this.numericParametricFieldsCollection,
                dateParametricFieldsCollection: this.dateParametricFieldsCollection,
                queryModel: this.queryModel,
                queryState: this.queryState,
                previewModeModel: this.previewModeModel,
                searchCollections: this.searchCollections,
                searchTypes: this.searchTypes
            };

            var clickHandlerArguments = {
                queryTextModel: this.queryState.queryTextModel,
                savedQueryCollection: this.searchCollections.QUERY,
                savedSearchModel: this.savedSearchModel,
                selectedTabModel: this.selectedTabModel
            };

            if (hasBiRole) {
                this.savedSearchControlView = new SavedSearchControlView(_.extend(this.getSavedSearchControlViewOptions(), subViewArguments));

                if (this.searchTypes[searchType].showTimeBar) {
                    this.timeBarModel = new Backbone.Model({
                        graphedFieldName: null,
                        graphedDataType: null
                    });

                    this.listenTo(this.timeBarModel, 'change:graphedFieldName', this.updateTimeBar);
                }
            }

            this.leftSideFooterView = new this.searchTypes[searchType].LeftSideFooterView(_.extend({timeBarModel: this.timeBarModel}, subViewArguments));

            var MiddleColumnHeaderView = this.searchTypes[searchType].MiddleColumnHeaderView;
            this.middleColumnHeaderView = MiddleColumnHeaderView ? new MiddleColumnHeaderView(subViewArguments) : null;

            var relatedConceptsClickHandler = this.searchTypes[searchType].relatedConceptsClickHandler(clickHandlerArguments);

            this.relatedConceptsView = new RelatedConceptsView(_.extend({
                clickHandler: relatedConceptsClickHandler
            }, subViewArguments));

            this.middleColumnScrollModel = new Backbone.Model();

            var resultsView = new this.ResultsView(_.defaults({
                relatedConceptsClickHandler: relatedConceptsClickHandler,
                fetchStrategy: this.searchTypes[searchType].fetchStrategy,
                scrollModel: this.middleColumnScrollModel
            }, subViewArguments));

            this.resultsViews = _.where([{
                Constructor: this.ResultsViewAugmentation,
                id: 'list',
                shown: true,
                uniqueId: _.uniqueId('results-view-item-'),
                constructorArguments: {
                    resultsView: resultsView,
                    queryModel: this.queryModel,
                    previewModeModel: this.previewModeModel,
                    scrollModel: this.middleColumnScrollModel
                },
                events: {
                    // needs binding as the view container will be the eventual listener
                    'rightSideContainerHideToggle': _.bind(this.rightSideContainerHideToggle, this)
                },
                selector: {
                    displayNameKey: 'list',
                    icon: 'hp-list'
                }
            }, {
                Constructor: TopicMapView,
                id: 'topic-map',
                shown: hasBiRole,
                uniqueId: _.uniqueId('results-view-item-'),
                constructorArguments: _.extend({
                    clickHandler: relatedConceptsClickHandler,
                    type: 'QUERY'
                }, subViewArguments),
                selector: {
                    displayNameKey: 'topic-map',
                    icon: 'hp-grid'
                }
            }, {
                Constructor: SunburstView,
                constructorArguments: subViewArguments,
                id: 'sunburst',
                shown: hasBiRole && this.displayDependentParametricViews,
                uniqueId: _.uniqueId('results-view-item-'),
                selector: {
                    displayNameKey: 'sunburst',
                    icon: 'hp-favorite'
                }
            }, {
                Constructor: MapResultsView,
                id: 'map',
                shown: hasBiRole && configuration().map.enabled,
                uniqueId: _.uniqueId('results-view-item-'),
                constructorArguments: _.extend({
                    resultsStep: this.mapViewResultsStep,
                    allowIncrement: this.mapViewAllowIncrement
                }, subViewArguments),
                selector: {
                    displayNameKey: 'map',
                    icon: 'hp-map-view'
                }
            }, {
                Constructor: TableView,
                constructorArguments: subViewArguments,
                id: 'table',
                shown: hasBiRole && this.displayDependentParametricViews,
                uniqueId: _.uniqueId('results-view-item-'),
                selector: {
                    displayNameKey: 'table',
                    icon: 'hp-table'
                }
            }], {shown: true});

            var resultsViewSelectionModel = new Backbone.Model({
                // ID of the currently selected tab
                selectedTab: this.resultsViews[0].id
            });

            // need a selector if multiple active views
            if (this.resultsViews.length > 1) {
                this.resultsViewSelection = new ResultsViewSelection({
                    views: this.resultsViews,
                    model: resultsViewSelectionModel
                });
            }

            this.resultsViewContainer = new ResultsViewContainer({
                views: this.resultsViews,
                model: resultsViewSelectionModel
            });

            this.listenTo(this.queryModel, 'refresh', this.fetchData);
            this.listenTo(this.queryModel, 'change', this.fetchRestrictedParametricCollection);
            this.fetchParametricFields(this.parametricFieldsCollection, _.bind(this.fetchParametricValueCollections, this));
            this.fetchParametricFields(this.numericParametricFieldsCollection);
            this.fetchParametricFields(this.dateParametricFieldsCollection);
            this.fetchEntities();

            this.updateScrollParameters = updateScrollParameters.bind(this);

            $window
                .scroll(this.updateScrollParameters)
                .resize(this.updateScrollParameters);
        },

        render: function() {
            var hasBiRole = configuration().hasBiRole;

            this.$el.html(template({
                headerControlsHtml: this.headerControlsHtml,
                hasBiRole: hasBiRole
            }));

            this.$middleContainer = this.$('.middle-container');
            this.renderTimeBar();

            if (this.savedSearchControlView) {
                // the padding looks silly if we don't have the view so add it here
                var $searchOptionContainer = this.$('.search-options-container').addClass('p-sm');

                this.savedSearchControlView.setElement($searchOptionContainer).render();
            }

            this.relatedConceptsView.render();

            this.$('.related-concepts-container').append(this.relatedConceptsView.$el);

            if (this.resultsViewSelection) {
                this.resultsViewSelection.setElement(this.$('.results-view-selection')).render();
            }

            this.resultsViewContainer.setElement(this.$('.results-view-container')).render();

            this.leftSideFooterView.setElement(this.$('.left-side-footer')).render();

            if (this.middleColumnHeaderView) {
                this.middleColumnHeaderView.setElement(this.$('.middle-column-header')).render();
            }

            this.$('.container-toggle').on('click', this.containerToggle);

            this.$middleContainerContents = this.$('.middle-container-contents').scroll(this.updateScrollParameters);
            this.updateScrollParameters();
        },

        renderTimeBar: function() {
            if (this.timeBarView && this.$middleContainer) {
                this.$middleContainer.append(this.timeBarView.$el);
                this.timeBarView.render();
            }
        },

        updateTimeBar: function() {
            var graphedFieldName = this.timeBarModel.get('graphedFieldName');
            var graphedDataType = this.timeBarModel.get('graphedDataType');
            var collapsed = graphedFieldName === null;

            if (this.$middleContainer) {
                this.$middleContainer.toggleClass('middle-container-with-time-bar', !collapsed);
            }

            if (this.timeBarView) {
                this.timeBarView.remove();
                this.timeBarView = null;
            }

            if (!collapsed) {
                this.timeBarView = new TimeBarView({
                    queryModel: this.queryModel,
                    queryState: this.queryState,
                    previewModeModel: this.previewModeModel,
                    timeBarModel: this.timeBarModel,
                    numericParametricFieldsCollection: this.numericParametricFieldsCollection,
                    dateParametricFieldsCollection: this.dateParametricFieldsCollection
                });

                this.renderTimeBar();
            }
        },

        fetchData: function() {
            this.fetchEntities();
            this.fetchParametricValues();
        },

        fetchEntities: function() {
            if (this.queryModel.get('queryText') && this.queryModel.get('indexes').length !== 0) {
                var data = {
                    databases: this.queryModel.get('indexes'),
                    queryText: this.queryModel.get('queryText'),
                    fieldText: this.queryModel.get('fieldText'),
                    minDate: this.queryModel.getIsoDate('minDate'),
                    maxDate: this.queryModel.getIsoDate('maxDate'),
                    minScore: this.queryModel.get('minScore'),
                    stateTokens: this.queryModel.get('stateMatchIds')
                };

                this.entityCollection.fetch({data: data});
            }
        },

        containerToggle: function(event) {
            var $containerToggle = $(event.currentTarget);
            var $sideContainer = $containerToggle.closest('.side-container');
            var hide = !$sideContainer.hasClass('small-container');

            $sideContainer.find('.side-panel-content').toggleClass('hide', hide);
            $sideContainer.toggleClass('small-container', hide);
            $containerToggle.toggleClass('fa-rotate-180', hide);
        },

        fetchParametricValueCollections: function() {
            this.fetchParametricValues();
            this.fetchRestrictedParametricCollection();
        },

        fetchRestrictedParametricCollection: function() {
            this.restrictedParametricCollection.reset();
            
            var fieldNames = this.parametricFieldsCollection.pluck('id');

            if (fieldNames.length > 0 && this.queryModel.get('indexes').length !== 0) {
                this.restrictedParametricCollection.fetch({
                    data: {
                        fieldNames: fieldNames,
                        databases: this.queryModel.get('indexes'),
                        queryText: this.queryModel.get('queryText'),
                        fieldText: this.queryModel.get('fieldText'),
                        minDate: this.queryModel.getIsoDate('minDate'),
                        maxDate: this.queryModel.getIsoDate('maxDate'),
                        minScore: this.queryModel.get('minScore'),
                        stateTokens: this.queryModel.get('stateMatchIds')
                    }
                });
            }
        },

        rightSideContainerHideToggle: function(toggle) {
            this.$('.right-side-container').toggle(toggle);
        },

        remove: function() {
            $window
                .off('resize', this.updateScrollParameters)
                .off('scroll', this.updateScrollParameters);

            this.queryModel.stopListening();

            _.chain([
                this.savedSearchControlView,
                this.resultsViewContainer,
                this.resultsViewSelection,
                this.relatedConceptsView,
                this.leftSideFooterView,
                this.middleColumnHeaderView,
                this.timeBarView
            ])
                .compact()
                .invoke('remove');

            Backbone.View.prototype.remove.call(this);
        }
    });

});
