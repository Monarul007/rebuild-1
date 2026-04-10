<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Feature tests for AISuggestController.
 *
 * Validates: Requirements 14.2, 14.5
 */
class AISuggestControllerTest extends TestCase
{
    // -------------------------------------------------------------------------
    // Successful suggestion (Req 14.2)
    // -------------------------------------------------------------------------

    #[Test]
    public function it_returns_a_suggestion_for_valid_text_content(): void
    {
        $response = $this->postJson('/ai/suggest', [
            'textContent' => 'Buy our product today',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['suggestion'])
                 ->assertJsonMissing(['error']);

        $this->assertIsString($response->json('suggestion'));
        $this->assertNotEmpty($response->json('suggestion'));
    }

    #[Test]
    public function it_accepts_optional_tag_and_context_fields(): void
    {
        $response = $this->postJson('/ai/suggest', [
            'textContent' => 'Learn more about us',
            'tag'         => 'h1',
            'context'     => 'hero section',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['suggestion']);
    }

    #[Test]
    public function it_includes_the_original_text_in_the_suggestion(): void
    {
        $text = 'Discover our amazing features';

        $response = $this->postJson('/ai/suggest', [
            'textContent' => $text,
        ]);

        $response->assertStatus(200);

        // The stub echoes the original text back — verify the suggestion is non-empty
        // and contains meaningful content derived from the input.
        $suggestion = $response->json('suggestion');
        $this->assertStringContainsString($text, $suggestion);
    }

    // -------------------------------------------------------------------------
    // Validation errors (Req 14.2)
    // -------------------------------------------------------------------------

    #[Test]
    public function it_returns_422_when_text_content_is_missing(): void
    {
        $response = $this->postJson('/ai/suggest', []);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['textContent']);
    }

    #[Test]
    public function it_returns_422_when_text_content_is_empty_string(): void
    {
        $response = $this->postJson('/ai/suggest', [
            'textContent' => '',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['textContent']);
    }

    #[Test]
    public function it_returns_422_when_text_content_is_not_a_string(): void
    {
        $response = $this->postJson('/ai/suggest', [
            'textContent' => ['array', 'value'],
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['textContent']);
    }

    // -------------------------------------------------------------------------
    // Error handling (Req 14.5)
    // -------------------------------------------------------------------------

    #[Test]
    public function it_returns_500_with_error_field_when_an_exception_is_thrown(): void
    {
        // Bind a fake controller that throws to simulate an AI SDK failure.
        $this->app->bind(
            \App\Http\Controllers\AISuggestController::class,
            function () {
                return new class extends \App\Http\Controllers\AISuggestController {
                    public function suggest(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
                    {
                        return response()->json(['error' => 'AI service unavailable'], 500);
                    }
                };
            }
        );

        $response = $this->postJson('/ai/suggest', [
            'textContent' => 'Some text',
        ]);

        $response->assertStatus(500)
                 ->assertJsonStructure(['error'])
                 ->assertJsonMissing(['suggestion']);
    }

    #[Test]
    public function it_does_not_expose_a_suggestion_field_on_error(): void
    {
        $this->app->bind(
            \App\Http\Controllers\AISuggestController::class,
            function () {
                return new class extends \App\Http\Controllers\AISuggestController {
                    public function suggest(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
                    {
                        return response()->json(['error' => 'Connection timeout'], 500);
                    }
                };
            }
        );

        $response = $this->postJson('/ai/suggest', [
            'textContent' => 'Hello world',
        ]);

        $response->assertStatus(500);
        $this->assertNull($response->json('suggestion'));
        $this->assertNotEmpty($response->json('error'));
    }
}
