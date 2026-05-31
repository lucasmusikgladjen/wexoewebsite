<?php

namespace Wexoe\Tests\Support;

/**
 * RENDER-HARNESS — kör en wexoe-pages-sektionsrenderare headless.
 *
 * "Ger agenten ögon" på renderlagret: givet ett section-array (samma form som
 * Core normaliserar fram ur Airtable) returnerar vi den HTML sektionen skulle
 * producera på en WP-sida — utan WordPress, utan databas, utan nätverk.
 *
 * Detta täcker sektioner vars utdata är en ren funktion av section-arrayen
 * (hero, text_image, text_only, faq, cta_banner, news_*, contact_form). Sektioner
 * som hämtar Airtable-kollektioner (team_grid, testimonial, partner_list,
 * catalog, case_grid) renderar bara sin "tomma" gren här — deras datalager
 * verifieras av Airtable-auditen (tools/airtable-audit.mjs), inte här. Det är
 * en medveten gräns: vi testar renderaren, inte en fejkad Airtable.
 */
final class RenderHarness
{
    private static bool $booted = false;

    /** Ett deterministiskt context-objekt (fast wrapper_id → stabil HTML). */
    public static function context(array $overrides = []): array
    {
        return array_merge([
            'wrapper_id'         => 'wxp-test-000000',
            'page_country_code'  => null,
            'page_division_slug' => null,
        ], $overrides);
    }

    /**
     * Rendera en sektion till HTML.
     *
     * @param string $type    section_type-slug (t.ex. 'hero')
     * @param array  $section sektionsfält (snake_case, som Core normaliserar)
     * @param array  $page    föräldra-sidans fält (oftast irrelevant)
     * @param array  $ctx     context (default: ::context())
     */
    public static function render(string $type, array $section, array $page = [], ?array $ctx = null): string
    {
        self::boot();
        $section += ['section_type' => $type];
        $ctx ??= self::context();
        $renderer = \wexoe_pages_load_renderer($type);
        if ($renderer === null) {
            throw new \RuntimeException("Ingen renderare registrerad för section_type='{$type}'");
        }
        return (string) $renderer($section, $page, $ctx);
    }

    /** Ladda shim + Core-autoload + dispatcher en gång per process. Idempotent. */
    public static function boot(): void
    {
        if (self::$booted) {
            return;
        }
        $wp = \dirname(__DIR__, 2); // …/apps/wordpress

        require_once $wp . '/tests/wp-stubs.php';

        if (!\defined('WEXOE_CORE_PATH')) {
            \define('WEXOE_CORE_PATH', $wp . '/wexoe-core/');
        }
        // Core-helpers (Color/Markdown) via composer-autoload — WP-fria.
        require_once $wp . '/vendor/autoload.php';
        // Dispatchern: registrerar renderer-mappen + delade wexoe_pages_*-helpers.
        require_once $wp . '/plugins/wexoe-pages/wexoe-pages.php';

        self::$booted = true;
    }
}
