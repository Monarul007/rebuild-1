import React from 'react';
import { router } from '@inertiajs/react';

interface PageModel {
    id: number;
    title: string;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

interface IndexProps {
    pages: PageModel[];
}

export default function Index({ pages }: IndexProps) {
    function handleDelete(id: number) {
        if (confirm('Are you sure you want to delete this page?')) {
            router.delete(`/pages/${id}`);
        }
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>Pages</h1>
                <button
                    onClick={() => router.get('/pages/create')}
                    style={{
                        padding: '10px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    + Create New Page
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase' }}>ID</th>
                            <th style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase' }}>Title</th>
                            <th style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase' }}>Published</th>
                            <th style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase' }}>Created</th>
                            <th style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ borderTop: '1px solid #e5e7eb' }}>
                        {pages.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                                    No pages found. Create one to get started!
                                </td>
                            </tr>
                        ) : (
                            pages.map((page) => (
                                <tr key={page.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>#{page.id}</td>
                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                                        {page.title || 'Untitled Page'}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#4b5563' }}>
                                        {page.published_at ? new Date(page.published_at).toLocaleDateString() : 'Draft'}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#4b5563' }}>
                                        {new Date(page.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <a
                                            href={`/pages/${page.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-block',
                                                textDecoration: 'none',
                                                marginRight: '12px',
                                                padding: '6px 12px',
                                                background: '#f0fdf4',
                                                color: '#15803d',
                                                border: '1px solid #bbf7d0',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            View
                                        </a>
                                        <button
                                            onClick={() => router.get(`/pages/${page.id}/edit`)}
                                            style={{
                                                marginRight: '12px',
                                                padding: '6px 12px',
                                                background: '#eff6ff',
                                                color: '#1d4ed8',
                                                border: '1px solid #bfdbfe',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(page.id)}
                                            style={{
                                                padding: '6px 12px',
                                                background: '#fef2f2',
                                                color: '#dc2626',
                                                border: '1px solid #fecaca',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
