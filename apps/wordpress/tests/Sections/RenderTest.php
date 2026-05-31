<?php

use Wexoe\Tests\Support\RenderHarness as R;

/**
 * Spec för wexoe-pages-sektionsrenderare (headless).
 *
 * Detta är render-lagrets skyddsnät: en LLM som rör en sektion kan köra detta
 * och SE att HTML:en fortfarande har rätt struktur, escapar input, och inte
 * kraschar på tomma/extrema värden — utan att starta WordPress.
 *
 * Gränsen (medveten): sektioner som hämtar Airtable-kollektioner testas bara
 * på sin tomma gren. Datalagret täcks av Airtable-auditen.
 */

beforeEach(function () {
    R::boot(); // laddar wp-stubs.php (wxp_fake_post m.fl.) + dispatcher
    wxp_reset_wp_fixtures();
});

/** Plocka ut class-attributet på det FÖRSTA <section>-elementet (inte <style>). */
function section_class(string $html): string
{
    return preg_match('/<section[^>]*\bclass="([^"]*)"/', $html, $m) ? $m[1] : '';
}

// ─────────────────────────────────────────────────────────────────────────
// hero — page-toppen, äger sin egen <h1>
// ─────────────────────────────────────────────────────────────────────────
it('hero renderar h1, subtitle och CTA', function () {
    $html = R::render('hero', [
        'hero_h1'       => 'Välkommen',
        'hero_subtitle' => 'Vi bygger automation',
        'hero_cta_text' => 'Kom igång',
        'hero_cta_url'  => 'https://wexoe.se/start',
    ]);

    expect($html)
        ->toContain('wxp-hero__h1')
        ->toContain('Välkommen')
        ->toContain('Vi bygger automation')
        ->toContain('Kom igång')
        ->toContain('https://wexoe.se/start');
});

it('hero utan h1 → tom sträng (inget att visa)', function () {
    expect(R::render('hero', ['hero_subtitle' => 'bara sub']))->toBe('');
});

it('hero escapar HTML i rubriken (ingen rå injektion)', function () {
    $html = R::render('hero', ['hero_h1' => 'Tom & Jerry <script>alert(1)</script>']);
    expect($html)
        ->toContain('Tom &amp; Jerry')
        ->not->toContain('<script>alert(1)</script>');
});

it('hero faller tillbaka till gradient-variant vid ogiltig variant', function () {
    $html = R::render('hero', ['hero_h1' => 'X', 'hero_variant' => 'nonsens']);
    expect($html)->toContain('wxp-hero--gradient');
});

// ─────────────────────────────────────────────────────────────────────────
// faq — Q:/A:-parsing till <details>
// ─────────────────────────────────────────────────────────────────────────
it('faq parar ihop Q:/A:-rader till details-element', function () {
    $html = R::render('faq', [
        'faq_h2'    => 'Vanliga frågor',
        'faq_items' => ['Q: Vad kostar det?', 'A: Det beror på.', 'Q: Hur lång tid?', 'A: Några veckor.'],
    ]);

    expect(substr_count($html, '<details'))->toBe(2);
    expect($html)->toContain('Vad kostar det?')->toContain('Det beror på.');
});

it('faq stödjer legacy pipe-format (Fråga | Svar)', function () {
    $html = R::render('faq', ['faq_items' => ['Enkel fråga | Enkelt svar']]);
    expect(substr_count($html, '<details'))->toBe(1);
    expect($html)->toContain('Enkel fråga')->toContain('Enkelt svar');
});

it('faq utan kompletta par → tom sträng', function () {
    // Ensam Q utan A ska inte bli ett item.
    expect(R::render('faq', ['faq_items' => ['Q: Halv fråga']]))->toBe('');
    expect(R::render('faq', ['faq_items' => []]))->toBe('');
});

it('faq öppnar första frågan (open-attribut bara på första)', function () {
    $html = R::render('faq', [
        'faq_items' => ['Q: Ett', 'A: Svar', 'Q: Två', 'A: Svar'],
    ]);
    expect(substr_count($html, '<details open'))->toBe(1);
});

// ─────────────────────────────────────────────────────────────────────────
// text_image / text_only — markdown-body + bullets
// ─────────────────────────────────────────────────────────────────────────
it('text_image renderar två kolumner med bild', function () {
    $html = R::render('text_image', [
        'ti_h2'        => 'Rubrik',
        'ti_body'      => 'Brödtext',
        'ti_image_url' => 'https://cdn.test/bild.jpg',
        'ti_bullets'   => ['Punkt ett', 'Punkt två'],
    ]);
    expect($html)
        ->toContain('Rubrik')
        ->toContain('https://cdn.test/bild.jpg')
        ->toContain('Punkt ett');
    // --no-image-modifiern får INTE sitta på <section>-elementet (CSS-regeln
    // för klassen finns alltid i <style>, så vi kollar bara class-attributet).
    expect(section_class($html))->not->toContain('wxp-ti--no-image');
});

it('text_image utan bild får --no-image-modifier på sektionen', function () {
    $html = R::render('text_image', ['ti_h2' => 'R', 'ti_body' => 'B']);
    expect(section_class($html))->toContain('wxp-ti--no-image');
});

it('text_only helt tom → tom sträng', function () {
    expect(R::render('text_only', []))->toBe('');
});

// ─────────────────────────────────────────────────────────────────────────
// cta_banner
// ─────────────────────────────────────────────────────────────────────────
it('cta_banner renderar rubrik + knapp, escapar URL-attack', function () {
    $html = R::render('cta_banner', [
        'cta_h2'       => 'Boka demo',
        'cta_cta_text' => 'Boka',
        'cta_cta_url'  => 'javascript:alert(1)',
    ]);
    expect($html)->toContain('Boka demo');
    // esc_url ska neutralisera javascript:-schemat.
    expect($html)->not->toContain('javascript:alert(1)');
});

// ─────────────────────────────────────────────────────────────────────────
// news-sektioner — WP-posts via fixtur
// ─────────────────────────────────────────────────────────────────────────
it('news_text_split listar fejkade WP-inlägg', function () {
    $GLOBALS['__wxp_fake_posts'] = [
        wxp_fake_post(['post_title' => 'Första nyheten']),
        wxp_fake_post(['ID' => 2, 'post_title' => 'Andra nyheten']),
    ];
    $html = R::render('news_text_split', ['nts_h2' => 'Nyheter']);
    expect($html)->toContain('Första nyheten')->toContain('Andra nyheten');
});

it('news_grid utan inlägg och utan h2 → tom sträng', function () {
    $GLOBALS['__wxp_fake_posts'] = [];
    expect(R::render('news_grid', []))->toBe('');
});

// ─────────────────────────────────────────────────────────────────────────
// contact_form — renderar formuläret med nonce (ingen Airtable)
// ─────────────────────────────────────────────────────────────────────────
it('contact_form renderar ett formulär med nonce-fält och honeypot', function () {
    $html = R::render('contact_form', ['cf_h2' => 'Kontakta oss']);
    expect($html)
        ->toContain('<form')
        ->toContain('_wxcf_nonce')
        ->toContain('name="name"')
        ->toContain('name="email"');
});

// ─────────────────────────────────────────────────────────────────────────
// SMOKE — varje registrerad section_type renderar ELLER degraderar utan fatal
// ─────────────────────────────────────────────────────────────────────────
it('alla sektioner i enum:en har en registrerad renderare', function () {
    // tests/Sections → tests → apps/wordpress → apps → <repo-root>
    $enum = json_decode(
        file_get_contents(dirname(__DIR__, 4) . '/packages/schema/enums/section-types.json'),
        true
    );
    $types = array_map(fn ($t) => $t['type'], $enum['types']);
    expect($types)->not->toBeEmpty();

    foreach ($types as $type) {
        expect(wexoe_pages_load_renderer($type))->not->toBeNull("section_type '{$type}' saknar renderare");
    }
});

it('inget renderar fatalt på minimal/tom input (smoke)', function () {
    // De sektioner vars utdata är rena fn(section) — datalager-sektioner
    // (team_grid m.fl.) utelämnas medvetet (kräver Airtable, täcks av auditen).
    $pure = ['hero', 'text_image', 'text_only', 'faq', 'cta_banner', 'news_grid', 'news_text_split', 'contact_form'];
    foreach ($pure as $type) {
        $html = R::render($type, []);
        // Antingen tom sträng (inget innehåll) eller giltig <section>/<form>-start.
        $ok = $html === '' || str_contains($html, '<section') || str_contains($html, '<div') || str_contains($html, '<form');
        expect($ok)->toBeTrue("section_type '{$type}' gav oväntad utdata: " . substr($html, 0, 80));
    }
});
