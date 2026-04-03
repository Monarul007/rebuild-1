import React, { useEffect, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import { PublishedRenderer } from '../../components/page-builder/PublishedRenderer';
import type { PageSchema } from '../../components/page-builder/types';

interface PageModel {
    id: number;
    title: string;
    schema: PageSchema;
    published_at: string | null;
}

interface ShowProps {
    page: PageModel;
}

export default function Show({ page }: ShowProps) {
    const { schema } = page;
    const sections = schema.sections || [];
    const customCss = schema.customCss || '';
    const customJs = schema.customJs || '';

    // Responsive styles generator
    const responsiveStyles = useMemo(() => {
        let css = '';
        function generateNodeCss(node: any) {
            const nodeIdSelector = `[data-node-id="${node.id}"]`;
            if (node.overrides?.base) {
                css += `${nodeIdSelector} {\n`;
                for (const [prop, val] of Object.entries(node.overrides.base)) {
                    const kebab = prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                    css += `  ${kebab}: ${val} !important;\n`;
                }
                css += `}\n`;
            }
            if (node.overrides?.md) {
                css += `@media (max-width: 768px) {\n  ${nodeIdSelector} {\n`;
                for (const [prop, val] of Object.entries(node.overrides.md)) {
                    const kebab = prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                    css += `    ${kebab}: ${val} !important;\n`;
                }
                css += `  }\n}\n`;
            }
            if (node.overrides?.sm) {
                css += `@media (max-width: 480px) {\n  ${nodeIdSelector} {\n`;
                for (const [prop, val] of Object.entries(node.overrides.sm)) {
                    const kebab = prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                    css += `    ${kebab}: ${val} !important;\n`;
                }
                css += `  }\n}\n`;
            }
            if (node.children) node.children.forEach(generateNodeCss);
        }
        sections.forEach(generateNodeCss);
        return css;
    }, [sections]);

    // Handle Custom JS execution
    useEffect(() => {
        if (!customJs) return;
        
        const script = document.createElement('script');
        script.id = 'page-custom-js';
        script.textContent = `
          (function() {
            function run() {
              try {
                ${customJs}
              } catch (e) {
                console.error('Custom JS Error:', e);
              }
            }
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', run);
            } else {
              run();
            }
          })();
        `;
        document.body.appendChild(script);
        
        return () => {
            const old = document.getElementById('page-custom-js');
            if (old) old.remove();
        };
    }, [customJs]);

    return (
        <>
            <Head>
                <title>{page.title}</title>
                {/* 1. Tailwind 4 Browser CDN - must be before CSS to scan things correctly */}
                <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                
                {/* 2. Base resets and responsive styles */}
                <style id="page-framework-styles">{`
                    html, body { 
                        margin: 0; padding: 0; background: #fff; 
                        width: 100%; min-height: 100%;
                    }
                    * { box-sizing: border-box; }
                    ${responsiveStyles}
                `}</style>
                
                {/* 3. User's Custom CSS - injected as source-ready CSS */}
                <style id="page-custom-styles" type="text/css">
                    {customCss}
                </style>
            </Head>
            
            <div id="page-root">
                {sections.map(section => (
                    <PublishedRenderer key={section.id} node={section} />
                ))}
            </div>
        </>
    );
}
