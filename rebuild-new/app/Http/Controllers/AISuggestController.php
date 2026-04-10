<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AISuggestController extends Controller
{
    public function suggest(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'textContent' => ['required', 'string'],
                'tag'         => ['nullable', 'string'],
                'context'     => ['nullable', 'string'],
            ]);

            $textContent = $validated['textContent'];

            // Stub implementation — replace with Laravel AI SDK when available.
            $suggestion = 'Here is an AI-suggested version: ' . $textContent . ' [AI enhanced]';

            return response()->json(['suggestion' => $suggestion]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
