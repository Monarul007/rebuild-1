<?php

namespace App\Http\Controllers;

use App\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PageController extends Controller
{
    public function index()
    {
        $pages = Page::orderBy('created_at', 'desc')->get();
        return inertia('Pages/Index', ['pages' => $pages]);
    }

    public function create()
    {
        return inertia('Pages/Builder', [
            'page' => null,
            'publishUrl' => route('pages.store'),
            'publishMethod' => 'post',
            'aiSuggestUrl' => route('ai.suggest')
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateSchema($request);
        
        $title = $request->input('title', 'Untitled Page');

        $page = Page::create([
            'title' => $title,
            'schema' => $validated['schema'],
            'published_at' => now(),
        ]);

        return redirect()->route('pages.edit', $page->id)->with('success', 'Page created successfully.');
    }

    public function edit(Page $page)
    {
        return inertia('Pages/Builder', [
            'page' => $page,
            'publishUrl' => route('pages.update', $page->id),
            'publishMethod' => 'put',
            'aiSuggestUrl' => route('ai.suggest')
        ]);
    }

    public function update(Request $request, Page $page)
    {
        $validated = $this->validateSchema($request);

        $title = $request->input('title', $page->title ?? 'Untitled Page');

        $page->update([
            'title' => $title,
            'schema' => $validated['schema'],
            'published_at' => now(),
        ]);

        return back()->with('success', 'Page updated successfully.');
    }

    public function destroy(Page $page)
    {
        $page->delete();
        return redirect()->route('pages.index')->with('success', 'Page deleted successfully.');
    }

    public function show(Page $page)
    {
        return inertia('Pages/Show', ['page' => $page]);
    }

    protected function validateSchema(Request $request)
    {
        $validated = $request->validate([
            'schema'           => ['required', 'array'],
            'schema.version'   => ['required', 'integer', 'in:1'],
            'schema.sections'  => ['required', 'array'],
            'schema.customCss' => ['nullable', 'string'],
            'schema.customJs'  => ['nullable', 'string'],
            'title'            => ['nullable', 'string', 'max:255'],
        ]);

        return $validated;
    }
}
