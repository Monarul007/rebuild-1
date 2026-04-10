<?php

namespace Tests\Feature;

use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PageBuilderControllerTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function validSchema(array $overrides = []): array
    {
        return array_merge([
            'schema' => [
                'version'  => 1,
                'sections' => [
                    [
                        'id'          => 'abc1234567',
                        'type'        => 'preset',
                        'tag'         => 'section',
                        'classes'     => ['bg-white', 'py-16'],
                        'overrides'   => [],
                        'children'    => [
                            [
                                'id'          => 'def1234567',
                                'type'        => 'preset',
                                'tag'         => 'h1',
                                'textContent' => 'Hello World',
                                'classes'     => ['text-4xl'],
                                'overrides'   => [],
                                'children'    => [],
                            ],
                        ],
                    ],
                ],
            ],
        ], $overrides);
    }

    // -------------------------------------------------------------------------
    // Successful publish (Req 11.4, 11.5)
    // -------------------------------------------------------------------------

    #[Test]
    public function it_persists_schema_and_returns_201_on_valid_publish(): void
    {
        $payload = $this->validSchema();

        $response = $this->postJson('/pages/publish', $payload);

        $response->assertStatus(201)
                 ->assertJsonFragment(['message' => 'Page published successfully.']);

        $this->assertDatabaseCount('pages', 1);

        $page = Page::first();
        $this->assertNotNull($page);
        $this->assertEquals($payload['schema'], $page->schema);
        $this->assertNotNull($page->published_at);
    }

    #[Test]
    public function it_persists_the_exact_schema_structure_in_the_database(): void
    {
        $payload = $this->validSchema();

        $this->postJson('/pages/publish', $payload)->assertStatus(201);

        $page = Page::first();

        $this->assertEquals(1, $page->schema['version']);
        $this->assertCount(1, $page->schema['sections']);
        $this->assertEquals('abc1234567', $page->schema['sections'][0]['id']);
        $this->assertEquals('preset', $page->schema['sections'][0]['type']);
    }

    #[Test]
    public function it_returns_the_new_page_id_in_the_response(): void
    {
        $response = $this->postJson('/pages/publish', $this->validSchema());

        $response->assertStatus(201)
                 ->assertJsonStructure(['message', 'page_id']);

        $pageId = $response->json('page_id');
        $this->assertTrue(Page::where('id', $pageId)->exists());
    }

    // -------------------------------------------------------------------------
    // Script-bearing payload rejection (Req 15.4)
    // -------------------------------------------------------------------------

    #[Test]
    public function it_rejects_schema_containing_script_tag_with_422(): void
    {
        $payload = $this->validSchema();
        $payload['schema']['sections'][0]['children'][0]['textContent'] = '<script>alert(1)</script>';

        $response = $this->postJson('/pages/publish', $payload);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['schema']);

        $this->assertDatabaseCount('pages', 0);
    }

    #[Test]
    public function it_rejects_schema_with_script_tag_in_attrs(): void
    {
        $payload = $this->validSchema();
        $payload['schema']['sections'][0]['attrs'] = ['data-x' => '<script>evil()</script>'];

        $response = $this->postJson('/pages/publish', $payload);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['schema']);

        $this->assertDatabaseCount('pages', 0);
    }

    #[Test]
    public function it_rejects_schema_with_uppercase_script_tag(): void
    {
        $payload = $this->validSchema();
        $payload['schema']['sections'][0]['children'][0]['textContent'] = '<SCRIPT>alert(1)</SCRIPT>';

        $response = $this->postJson('/pages/publish', $payload);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['schema']);
    }

    // -------------------------------------------------------------------------
    // Empty / malformed payload rejection (Req 11.5)
    // -------------------------------------------------------------------------

    #[Test]
    public function it_rejects_empty_payload_with_422(): void
    {
        $response = $this->postJson('/pages/publish', []);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['schema']);

        $this->assertDatabaseCount('pages', 0);
    }

    #[Test]
    public function it_rejects_payload_missing_version_with_422(): void
    {
        $payload = [
            'schema' => [
                'sections' => [],
            ],
        ];

        $response = $this->postJson('/pages/publish', $payload);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['schema.version']);
    }

    #[Test]
    public function it_rejects_payload_with_wrong_version_with_422(): void
    {
        $payload = $this->validSchema();
        $payload['schema']['version'] = 2;

        $response = $this->postJson('/pages/publish', $payload);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['schema.version']);
    }

    #[Test]
    public function it_rejects_payload_missing_sections_with_422(): void
    {
        $payload = [
            'schema' => [
                'version' => 1,
            ],
        ];

        $response = $this->postJson('/pages/publish', $payload);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['schema.sections']);
    }

    #[Test]
    public function it_rejects_schema_with_empty_sections_array_with_422(): void
    {
        // The 'required' rule treats an empty array as absent — sections must be non-empty
        $payload = [
            'schema' => [
                'version'  => 1,
                'sections' => [],
            ],
        ];

        $response = $this->postJson('/pages/publish', $payload);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['schema.sections']);

        $this->assertDatabaseCount('pages', 0);
    }
}
