import React from 'react';
import { PageBuilder } from '../../components/page-builder/PageBuilder';

interface PageModel {
    id: number;
    title: string;
    schema: any;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

interface BuilderProps {
    page: PageModel | null;
    publishUrl: string;
    publishMethod: 'post' | 'put';
    aiSuggestUrl: string;
}

export default function Builder({ page, publishUrl, publishMethod, aiSuggestUrl }: BuilderProps) {
    return (
        <PageBuilder
            initialSchema={page?.schema ?? undefined}
            initialTitle={page?.title ?? 'Untitled Page'}
            publishUrl={publishUrl}
            publishMethod={publishMethod}
            aiSuggestUrl={aiSuggestUrl}
        />
    );
}
