package com.hp.autonomy.frontend.find.hod.search;

import com.hp.autonomy.frontend.find.core.search.AbstractRelatedConceptsServiceIT;
import com.hp.autonomy.hod.client.api.resource.ResourceIdentifier;
import com.hp.autonomy.hod.client.api.textindex.query.search.Entity;
import com.hp.autonomy.hod.client.error.HodErrorException;

import java.util.Arrays;

public class HodRelatedConceptsServiceIT extends AbstractRelatedConceptsServiceIT<Entity, ResourceIdentifier, HodErrorException> {
    public HodRelatedConceptsServiceIT() {
        super(Arrays.asList(ResourceIdentifier.WIKI_ENG, ResourceIdentifier.NEWS_ENG));
    }
}
