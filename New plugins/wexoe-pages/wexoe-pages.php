<?php
/**
 * Plugin Name: Wexoe Pages
 * Plugin URI:  https://wexoe.se
 * Description: Tier 2-sidor (one-off meta-sidor: om-oss, karriär etc.). Renderar via [wexoe_page slug="..."]-shortcoden. Data lagras i cms_unique_pages-tabellen i Wexoe NY-basen. Beroende: wexoe-core ≥ 0.9.0.
 * Version:     0.1.0
 * Author:      Wexoe Industry AB
 * Requires PHP: 7.4
 * Requires at least: 6.0
 */

if (!defined('ABSPATH')) exit;

define('WEXOE_PAGES_VERSION', '0.1.0');

/* ============================================================
   CORE DEPENDENCY CHECK
   ============================================================ */

if (!function_exists('wexoe_pages_core_ready')) {
    function wexoe_pages_core_ready() {
        return class_exists('\\Wexoe\\Core\\Core')
            && method_exists('\\Wexoe\\Core\\Core', 'entity');
    }
}

/* ============================================================
   SHORTCODE
   ============================================================ */

add_shortcode('wexoe_page', 'wexoe_pages_shortcode');

function wexoe_pages_shortcode($atts) {
    $atts = shortcode_atts([
        'slug' => '',
    ], $atts, 'wexoe_page');

    $slug = trim((string) $atts['slug']);
    if ($slug === '') {
        return wexoe_pages_debug_comment('wexoe-pages: ingen slug angiven');
    }

    if (!wexoe_pages_core_ready()) {
        return wexoe_pages_debug_comment('wexoe-pages: wexoe-core är inte aktivt');
    }

    return wexoe_pages_render($slug);
}

/**
 * Render a Tier 2-sida från cms_unique_pages.
 *
 * Returnerar tom sträng om sidan inte finns eller inte är publicerad.
 * Sektioner renderas i fast ordning baserat på `show_<x>`-flaggor.
 */
function wexoe_pages_render($slug) {
    $repo = \Wexoe\Core\Core::entity('cms_unique_pages');
    if ($repo === null) {
        return wexoe_pages_debug_comment('wexoe-pages: cms_unique_pages-schema saknas');
    }

    $page = $repo->find_by('slug', $slug);
    if ($page === null) {
        return wexoe_pages_debug_comment('wexoe-pages: hittade inte slug=' . esc_html($slug));
    }

    if (empty($page['is_published'])) {
        return wexoe_pages_debug_comment('wexoe-pages: sidan finns men är inte publicerad');
    }

    ob_start();
    echo '<article class="wxp-page">';

    // Top-level H1 visas bara om Hero-sektionen är AV. Hero-sektionen renderar sin egen H1.
    if (empty($page['show_hero']) && !empty($page['h1'])) {
        echo '<h1 class="wxp-page__h1">' . esc_html($page['h1']) . '</h1>';
    }

    // Sektioner i FAST ordning. Detta är designval — inte redigerbart.
    if (!empty($page['show_hero'])) {
        wexoe_pages_render_hero($page);
    }

    if (!empty($page['show_text_image_a'])) {
        wexoe_pages_render_text_image([
            'h2'        => $page['text_image_a_h2'] ?? '',
            'body'      => $page['text_image_a_body'] ?? '',
            'image_url' => (string) ($page['text_image_a_image_url'] ?? ''),
            'reversed'  => !empty($page['text_image_a_reversed']),
            'theme'     => $page['text_image_a_theme'] ?? 'light',
        ]);
    }

    if (!empty($page['show_text_image_b'])) {
        wexoe_pages_render_text_image([
            'h2'        => $page['text_image_b_h2'] ?? '',
            'body'      => $page['text_image_b_body'] ?? '',
            'image_url' => (string) ($page['text_image_b_image_url'] ?? ''),
            'reversed'  => !empty($page['text_image_b_reversed']),
            'theme'     => $page['text_image_b_theme'] ?? 'light',
        ]);
    }

    if (!empty($page['show_text_only'])) {
        wexoe_pages_render_text_only($page);
    }

    if (!empty($page['show_faq'])) {
        wexoe_pages_render_faq($page);
    }

    if (!empty($page['show_team_grid'])) {
        wexoe_pages_render_team_grid($page);
    }

    if (!empty($page['show_partners_marquee'])) {
        wexoe_pages_render_partners_marquee($page);
    }

    if (!empty($page['show_testimonial_card'])) {
        wexoe_pages_render_testimonial_card($page);
    }

    if (!empty($page['show_cta_banner'])) {
        wexoe_pages_render_cta_banner($page);
    }

    // Contact form-sektionen.
    if (!empty($page['show_contact_form']) && class_exists('\\Wexoe\\Core\\Renderers\\ContactForm')) {
        echo '<section id="kontakt">';
        echo \Wexoe\Core\Renderers\ContactForm::render(wexoe_pages_build_contact_form_config($page));
        echo '</section>';
    }

    // Tredjepartsutökning.
    do_action('wexoe_pages_render_sections', $page);

    echo '</article>';
    return ob_get_clean();
}

/* ============================================================
   SECTION RENDERERS (inbäddad HTML — egen för wexoe-pages)
   ============================================================ */

function wexoe_pages_render_hero($page) {
    $title = trim((string) (!empty($page['hero_h1_override']) ? $page['hero_h1_override'] : ($page['h1'] ?? '')));
    if ($title === '') return;

    $eyebrow = (string) ($page['hero_eyebrow'] ?? '');
    $subtitle = (string) ($page['hero_subtitle'] ?? '');
    $image_url = (string) ($page['hero_image_url'] ?? '');
    $cta_text = (string) ($page['hero_cta_text'] ?? '');
    $cta_url = (string) ($page['hero_cta_url'] ?? '');
    $theme = (($page['hero_theme'] ?? 'dark') === 'light') ? 'light' : 'dark';

    $bg_style = $image_url !== ''
        ? "background-image: url('" . esc_url($image_url) . "'); background-size: cover; background-position: center;"
        : '';
    ?>
    <section class="wxp-hero wxp-hero--<?= esc_attr($theme) ?>" style="<?= esc_attr($bg_style) ?>">
        <div class="wxp-hero__inner">
            <?php if ($eyebrow !== ''): ?>
                <p class="wxp-hero__eyebrow"><?= esc_html($eyebrow) ?></p>
            <?php endif; ?>
            <h1 class="wxp-hero__title"><?= esc_html($title) ?></h1>
            <?php if ($subtitle !== ''): ?>
                <p class="wxp-hero__subtitle"><?= nl2br(esc_html($subtitle)) ?></p>
            <?php endif; ?>
            <?php if ($cta_text !== '' && $cta_url !== ''): ?>
                <a class="wxp-hero__cta" href="<?= esc_url($cta_url) ?>"><?= esc_html($cta_text) ?></a>
            <?php endif; ?>
        </div>
    </section>
    <style>
        .wxp-hero { padding: 80px 24px; color: #fff; background-color: #11325D; }
        .wxp-hero--light { background-color: #F5F6F8; color: #1A1A1A; }
        .wxp-hero__inner { max-width: 960px; margin: 0 auto; }
        .wxp-hero__eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; opacity: 0.8; margin: 0 0 12px; }
        .wxp-hero__title { font-size: clamp(2rem, 4vw, 3rem); line-height: 1.15; margin: 0 0 12px; font-weight: 600; }
        .wxp-hero__subtitle { font-size: 18px; line-height: 1.5; opacity: 0.85; margin: 0 0 24px; max-width: 60ch; }
        .wxp-hero__cta { display: inline-block; padding: 12px 24px; border-radius: 8px; background: #F28C28; color: #fff; text-decoration: none; font-weight: 500; }
        .wxp-hero--light .wxp-hero__cta { background: #11325D; }
    </style>
    <?php
}

function wexoe_pages_render_text_image(array $config) {
    $h2 = (string) ($config['h2'] ?? '');
    $body = (string) ($config['body'] ?? '');
    $image_url = (string) ($config['image_url'] ?? '');
    $reversed = !empty($config['reversed']);
    $theme = (($config['theme'] ?? 'light') === 'dark') ? 'dark' : 'light';

    if ($h2 === '' && $body === '' && $image_url === '') return;

    $body_html = $body !== '' && class_exists('\\Wexoe\\Core\\Helpers\\Markdown')
        ? \Wexoe\Core\Helpers\Markdown::to_html($body)
        : nl2br(esc_html($body));
    ?>
    <section class="wxp-ti wxp-ti--<?= esc_attr($theme) ?> <?= $reversed ? 'wxp-ti--reversed' : '' ?>">
        <div class="wxp-ti__inner">
            <div class="wxp-ti__text">
                <?php if ($h2 !== ''): ?><h2 class="wxp-ti__h2"><?= esc_html($h2) ?></h2><?php endif; ?>
                <?php if ($body_html !== ''): ?><div class="wxp-ti__body"><?= $body_html ?></div><?php endif; ?>
            </div>
            <?php if ($image_url !== ''): ?>
                <div class="wxp-ti__image-wrap">
                    <img class="wxp-ti__image" src="<?= esc_url($image_url) ?>" alt="" loading="lazy" />
                </div>
            <?php endif; ?>
        </div>
    </section>
    <style>
        .wxp-ti { padding: 64px 24px; }
        .wxp-ti--dark { background: #0A1A2E; color: #fff; }
        .wxp-ti--light { background: #fff; color: #1A1A1A; }
        .wxp-ti__inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
        .wxp-ti--reversed .wxp-ti__inner { grid-template-columns: 1fr 1fr; }
        .wxp-ti--reversed .wxp-ti__text { order: 2; }
        .wxp-ti__h2 { font-size: clamp(1.5rem, 3vw, 2rem); margin: 0 0 16px; font-weight: 600; }
        .wxp-ti__body { font-size: 16px; line-height: 1.65; }
        .wxp-ti__image { width: 100%; height: auto; border-radius: 8px; display: block; }
        @media (max-width: 720px) { .wxp-ti__inner { grid-template-columns: 1fr; } .wxp-ti--reversed .wxp-ti__text { order: 0; } }
    </style>
    <?php
}

function wexoe_pages_render_text_only($page) {
    $h2 = (string) ($page['text_only_h2'] ?? '');
    $body = (string) ($page['text_only_body'] ?? '');
    $align = (($page['text_only_align'] ?? 'left') === 'center') ? 'center' : 'left';

    if ($h2 === '' && $body === '') return;

    $body_html = $body !== '' && class_exists('\\Wexoe\\Core\\Helpers\\Markdown')
        ? \Wexoe\Core\Helpers\Markdown::to_html($body)
        : nl2br(esc_html($body));
    ?>
    <section class="wxp-text wxp-text--<?= esc_attr($align) ?>">
        <div class="wxp-text__inner">
            <?php if ($h2 !== ''): ?><h2 class="wxp-text__h2"><?= esc_html($h2) ?></h2><?php endif; ?>
            <?php if ($body_html !== ''): ?><div class="wxp-text__body"><?= $body_html ?></div><?php endif; ?>
        </div>
    </section>
    <style>
        .wxp-text { padding: 64px 24px; background: #fff; color: #1A1A1A; }
        .wxp-text__inner { max-width: 800px; margin: 0 auto; }
        .wxp-text--center .wxp-text__inner { text-align: center; }
        .wxp-text__h2 { font-size: clamp(1.5rem, 3vw, 2rem); margin: 0 0 16px; font-weight: 600; }
        .wxp-text__body { font-size: 16px; line-height: 1.65; }
    </style>
    <?php
}

function wexoe_pages_render_faq($page) {
    $h2 = (string) ($page['faq_h2'] ?? '');
    $items_raw = $page['faq_items'] ?? '';

    $lines = is_array($items_raw)
        ? $items_raw
        : array_values(array_filter(array_map('trim', explode("\n", (string) $items_raw)), function ($l) {
            return $l !== '';
        }));

    $parsed = [];
    foreach ($lines as $line) {
        if (preg_match('/^\s*\*\*(.+?)\*\*\s*\|\s*(.+)$/u', $line, $m)) {
            $parsed[] = ['q' => trim($m[1]), 'a' => trim($m[2])];
        }
    }

    if (empty($parsed)) return;
    ?>
    <section class="wxp-faq">
        <div class="wxp-faq__inner">
            <?php if ($h2 !== ''): ?><h2 class="wxp-faq__h2"><?= esc_html($h2) ?></h2><?php endif; ?>
            <ul class="wxp-faq__list">
                <?php foreach ($parsed as $i => $item): ?>
                    <li class="wxp-faq__item">
                        <details<?= $i === 0 ? ' open' : '' ?>>
                            <summary class="wxp-faq__q"><?= esc_html($item['q']) ?></summary>
                            <div class="wxp-faq__a"><?= nl2br(esc_html($item['a'])) ?></div>
                        </details>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
    </section>
    <style>
        .wxp-faq { padding: 64px 24px; background: #F5F6F8; color: #1A1A1A; }
        .wxp-faq__inner { max-width: 800px; margin: 0 auto; }
        .wxp-faq__h2 { font-size: clamp(1.5rem, 3vw, 2rem); margin: 0 0 24px; font-weight: 600; }
        .wxp-faq__list { list-style: none; padding: 0; margin: 0; }
        .wxp-faq__item { background: #fff; margin-bottom: 8px; border-radius: 8px; padding: 16px 20px; }
        .wxp-faq__q { font-weight: 500; cursor: pointer; outline: none; }
        .wxp-faq__a { margin-top: 8px; line-height: 1.6; color: #555; }
    </style>
    <?php
}

function wexoe_pages_render_team_grid($page) {
    if (!class_exists('\\Wexoe\\Core\\Helpers\\Collections')) return;

    $h2 = (string) ($page['team_grid_h2'] ?? '');
    $scope = wexoe_pages_resolve_scope($page, [
        'country'  => 'team_grid_scope_country',
        'division' => 'team_grid_scope_division',
        'limit'    => 'team_grid_limit',
    ]);

    $coworkers = \Wexoe\Core\Helpers\Collections::coworkers_for_scope($scope);
    if (empty($coworkers)) return;
    ?>
    <section class="wxp-tg">
        <div class="wxp-tg__inner">
            <?php if ($h2 !== ''): ?><h2 class="wxp-tg__h2"><?= esc_html($h2) ?></h2><?php endif; ?>
            <div class="wxp-tg__list">
                <?php foreach ($coworkers as $c):
                    $img_url = (string) ($c['image'] ?? '');
                ?>
                    <div class="wxp-tg__card">
                        <?php if ($img_url !== ''): ?>
                            <img class="wxp-tg__image" src="<?= esc_url($img_url) ?>" alt="" loading="lazy" />
                        <?php else: ?>
                            <div class="wxp-tg__image-placeholder"><?= esc_html(wexoe_pages_initials($c['full_name'] ?? '')) ?></div>
                        <?php endif; ?>
                        <h3 class="wxp-tg__name"><?= esc_html($c['full_name'] ?? '') ?></h3>
                        <?php if (!empty($c['title'])): ?>
                            <p class="wxp-tg__title"><?= esc_html($c['title']) ?></p>
                        <?php endif; ?>
                        <?php if (!empty($c['email']) || !empty($c['phone'])): ?>
                            <p class="wxp-tg__contact">
                                <?php if (!empty($c['email'])): ?>
                                    <a href="mailto:<?= esc_attr($c['email']) ?>"><?= esc_html($c['email']) ?></a>
                                <?php endif; ?>
                                <?php if (!empty($c['phone'])): ?>
                                    <a href="tel:<?= esc_attr(preg_replace('/\s+/', '', $c['phone'])) ?>"><?= esc_html($c['phone']) ?></a>
                                <?php endif; ?>
                            </p>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <style>
        .wxp-tg { padding: 64px 24px; background: #fff; }
        .wxp-tg__inner { max-width: 1100px; margin: 0 auto; }
        .wxp-tg__h2 { font-size: clamp(1.5rem, 3vw, 2rem); margin: 0 0 32px; font-weight: 600; }
        .wxp-tg__list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
        .wxp-tg__card { text-align: center; }
        .wxp-tg__image, .wxp-tg__image-placeholder { width: 140px; height: 140px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px; display: block; background: #F5F6F8; }
        .wxp-tg__image-placeholder { display: flex; align-items: center; justify-content: center; font-size: 36px; color: #999; font-weight: 500; }
        .wxp-tg__name { font-size: 16px; margin: 0 0 4px; font-weight: 500; }
        .wxp-tg__title { font-size: 13px; color: #777; margin: 0 0 8px; }
        .wxp-tg__contact a { display: block; font-size: 13px; color: #11325D; text-decoration: none; margin: 2px 0; }
    </style>
    <?php
}

function wexoe_pages_render_partners_marquee($page) {
    if (!class_exists('\\Wexoe\\Core\\Helpers\\Collections')) return;

    $h2 = (string) ($page['partners_marquee_h2'] ?? '');
    $scope = wexoe_pages_resolve_scope($page, [
        'country'  => 'partners_marquee_scope_country',
        'division' => 'partners_marquee_scope_division',
    ]);

    $partners = \Wexoe\Core\Helpers\Collections::partners_for_scope($scope);
    if (empty($partners)) return;
    ?>
    <section class="wxp-pm">
        <div class="wxp-pm__inner">
            <?php if ($h2 !== ''): ?><h2 class="wxp-pm__h2"><?= esc_html($h2) ?></h2><?php endif; ?>
            <div class="wxp-pm__row">
                <?php foreach ($partners as $p):
                    $logo_url = (string) ($p['logo'] ?? '');
                    if ($logo_url === '') continue;
                    $name = (string) ($p['name'] ?? '');
                    $url = (string) ($p['url'] ?? '');
                ?>
                    <?php if ($url !== ''): ?>
                        <a class="wxp-pm__item" href="<?= esc_url($url) ?>" rel="noopener" target="_blank">
                            <img src="<?= esc_url($logo_url) ?>" alt="<?= esc_attr($name) ?>" loading="lazy" />
                        </a>
                    <?php else: ?>
                        <span class="wxp-pm__item">
                            <img src="<?= esc_url($logo_url) ?>" alt="<?= esc_attr($name) ?>" loading="lazy" />
                        </span>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
        </div>
    </section>
    <style>
        .wxp-pm { padding: 48px 24px; background: #F5F6F8; }
        .wxp-pm__inner { max-width: 1200px; margin: 0 auto; text-align: center; }
        .wxp-pm__h2 { font-size: clamp(1.25rem, 2.5vw, 1.75rem); margin: 0 0 24px; font-weight: 600; opacity: 0.75; }
        .wxp-pm__row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 32px; }
        .wxp-pm__item img { max-height: 48px; width: auto; opacity: 0.7; filter: grayscale(0.5); transition: opacity 0.2s, filter 0.2s; }
        .wxp-pm__item:hover img { opacity: 1; filter: none; }
    </style>
    <?php
}

function wexoe_pages_render_testimonial_card($page) {
    if (!class_exists('\\Wexoe\\Core\\Helpers\\Collections')) return;

    $scope = wexoe_pages_resolve_scope($page, [
        'country'       => 'testimonial_scope_country',
        'division'      => 'testimonial_scope_division',
        'customer_type' => 'testimonial_scope_customer_type',
    ]);
    $scope_with_limit = $scope + ['limit' => 1];

    $testimonials = \Wexoe\Core\Helpers\Collections::testimonials_for_scope($scope_with_limit + ['featured_only' => true]);
    if (empty($testimonials)) {
        $testimonials = \Wexoe\Core\Helpers\Collections::testimonials_for_scope($scope_with_limit);
    }
    if (empty($testimonials)) return;

    $t = $testimonials[0];
    $quote = (string) ($t['quote'] ?? '');
    if ($quote === '') return;

    $author_image_url = (string) ($t['author_image'] ?? '');
    ?>
    <section class="wxp-tc">
        <div class="wxp-tc__inner">
            <blockquote class="wxp-tc__quote">"<?= esc_html($quote) ?>"</blockquote>
            <div class="wxp-tc__author">
                <?php if ($author_image_url !== ''): ?>
                    <img class="wxp-tc__img" src="<?= esc_url($author_image_url) ?>" alt="" loading="lazy" />
                <?php endif; ?>
                <div class="wxp-tc__byline">
                    <?php if (!empty($t['author_name'])): ?>
                        <strong><?= esc_html($t['author_name']) ?></strong>
                    <?php endif; ?>
                    <?php if (!empty($t['author_title'])): ?>
                        <span><?= esc_html($t['author_title']) ?></span>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </section>
    <style>
        .wxp-tc { padding: 64px 24px; background: #11325D; color: #fff; }
        .wxp-tc__inner { max-width: 720px; margin: 0 auto; text-align: center; }
        .wxp-tc__quote { font-size: clamp(1.125rem, 2vw, 1.5rem); line-height: 1.5; font-style: italic; margin: 0 0 24px; }
        .wxp-tc__author { display: inline-flex; align-items: center; gap: 12px; }
        .wxp-tc__img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
        .wxp-tc__byline { text-align: left; display: flex; flex-direction: column; }
        .wxp-tc__byline strong { font-weight: 500; }
        .wxp-tc__byline span { font-size: 13px; opacity: 0.75; }
    </style>
    <?php
}

function wexoe_pages_render_cta_banner($page) {
    $h2 = (string) ($page['cta_banner_h2'] ?? '');
    $body = (string) ($page['cta_banner_body'] ?? '');
    $cta_text = (string) ($page['cta_banner_cta_text'] ?? '');
    $cta_url = (string) ($page['cta_banner_cta_url'] ?? '');
    $theme = (($page['cta_banner_theme'] ?? 'dark') === 'light') ? 'light' : 'dark';

    if ($h2 === '' && $body === '') return;
    ?>
    <section class="wxp-cta wxp-cta--<?= esc_attr($theme) ?>">
        <div class="wxp-cta__inner">
            <?php if ($h2 !== ''): ?><h2 class="wxp-cta__h2"><?= esc_html($h2) ?></h2><?php endif; ?>
            <?php if ($body !== ''): ?><p class="wxp-cta__body"><?= nl2br(esc_html($body)) ?></p><?php endif; ?>
            <?php if ($cta_text !== '' && $cta_url !== ''): ?>
                <a class="wxp-cta__button" href="<?= esc_url($cta_url) ?>"><?= esc_html($cta_text) ?></a>
            <?php endif; ?>
        </div>
    </section>
    <style>
        .wxp-cta { padding: 64px 24px; }
        .wxp-cta--dark { background: #11325D; color: #fff; }
        .wxp-cta--light { background: #F5F6F8; color: #1A1A1A; }
        .wxp-cta__inner { max-width: 800px; margin: 0 auto; text-align: center; }
        .wxp-cta__h2 { font-size: clamp(1.5rem, 3vw, 2.25rem); margin: 0 0 16px; font-weight: 600; }
        .wxp-cta__body { font-size: 16px; line-height: 1.5; margin: 0 0 24px; opacity: 0.85; }
        .wxp-cta__button { display: inline-block; padding: 12px 28px; border-radius: 8px; background: #F28C28; color: #fff; text-decoration: none; font-weight: 500; }
        .wxp-cta--light .wxp-cta__button { background: #11325D; }
    </style>
    <?php
}

function wexoe_pages_initials($name) {
    $parts = preg_split('/\s+/', trim((string) $name));
    $initials = '';
    foreach ($parts as $p) {
        if ($p !== '') $initials .= mb_substr($p, 0, 1);
        if (mb_strlen($initials) >= 2) break;
    }
    return mb_strtoupper($initials);
}

/**
 * Sätt scope-array från sid-fält. Tomma scope-fält faller tillbaka på sidans
 * Country/Division-länkar.
 */
function wexoe_pages_resolve_scope($page, $field_map) {
    $scope = [];
    foreach ($field_map as $scope_key => $page_field) {
        $value = $page[$page_field] ?? '';
        if ($value !== '' && $value !== null) {
            $scope[$scope_key] = $value;
        }
    }
    // Fall tillbaka på sidans Country (via record-ID → kod).
    if (!isset($scope['country']) && !empty($page['country_ids'])) {
        $country_repo = \Wexoe\Core\Core::entity('core_countries');
        if ($country_repo !== null) {
            $records = $country_repo->find_by_ids($page['country_ids']);
            if (!empty($records) && !empty($records[0]['code'])) {
                $scope['country'] = $records[0]['code'];
            }
        }
    }
    // Fall tillbaka på sidans Division (via record-ID → slug).
    if (!isset($scope['division']) && !empty($page['division_ids'])) {
        $division_repo = \Wexoe\Core\Core::entity('core_divisions');
        if ($division_repo !== null) {
            $records = $division_repo->find_by_ids($page['division_ids']);
            if (!empty($records) && !empty($records[0]['slug'])) {
                $scope['division'] = $records[0]['slug'];
            }
        }
    }
    return $scope;
}

/**
 * Bygg ContactForm-renderer-config från cms_unique_pages-fält.
 */
function wexoe_pages_build_contact_form_config($page) {
    return [
        'eyebrow'        => $page['contact_form_eyebrow'] ?? '',
        'title'          => $page['contact_form_title'] ?? '',
        'subtitle'       => $page['contact_form_subtitle'] ?? '',
        'layout'         => $page['contact_form_layout'] ?? 'split',
        'theme'          => $page['contact_form_theme'] ?? 'dark',
        'show_company'   => $page['contact_form_show_company'] ?? true,
        'show_phone'     => $page['contact_form_show_phone'] ?? true,
        'show_dropdown'  => $page['contact_form_show_dropdown'] ?? true,
        'dropdown_label' => $page['contact_form_dropdown_label'] ?? '',
        'options'        => $page['contact_form_options'] ?? null,
        'cta_text'       => $page['contact_form_cta_text'] ?? '',
        'message_label'  => $page['contact_form_message_label'] ?? '',
        'trust_signals'  => $page['contact_form_trust_signals'] ?? null,
        'source_plugin'  => 'wexoe-pages',
        'page_slug'      => $page['slug'] ?? '',
        'contact_person' => !empty($page['contact_form_show_contact_person'])
            ? wexoe_pages_resolve_contact_person($page)
            : null,
    ];
}

/**
 * Slå upp första aktiva coworker baserat på sidans scope.
 */
function wexoe_pages_resolve_contact_person($page) {
    if (!class_exists('\\Wexoe\\Core\\Helpers\\Collections')) return null;
    $scope = wexoe_pages_resolve_scope($page, []) + ['limit' => 1];
    $matches = \Wexoe\Core\Helpers\Collections::coworkers_for_scope($scope);
    if (empty($matches)) return null;
    $c = $matches[0];
    return [
        'name'  => $c['full_name'] ?? '',
        'title' => $c['title'] ?? '',
        'email' => $c['email'] ?? '',
        'phone' => $c['phone'] ?? '',
        'image' => (string) ($c['image'] ?? ''),
    ];
}

/* ============================================================
   SEO META
   ============================================================ */

add_action('wp_head', 'wexoe_pages_seo_meta', 5);

function wexoe_pages_seo_meta() {
    if (!is_singular()) return;
    global $post;
    if (!$post || !is_object($post)) return;

    if (!preg_match('/\[wexoe_page\s+[^\]]*slug=["\']([^"\']+)["\']/i', $post->post_content, $m)) {
        return;
    }
    $slug = $m[1];

    if (!wexoe_pages_core_ready()) return;
    $repo = \Wexoe\Core\Core::entity('cms_unique_pages');
    if ($repo === null) return;
    $page = $repo->find_by('slug', $slug);
    if ($page === null || empty($page['is_published'])) return;

    $title = !empty($page['seo_title']) ? $page['seo_title'] : ($page['h1'] ?? '');
    $description = !empty($page['seo_description']) ? $page['seo_description'] : '';
    $og_image = !empty($page['og_image_url']) ? $page['og_image_url'] : '';

    if ($title !== '') {
        echo '<meta property="og:title" content="' . esc_attr($title) . '" />' . "\n";
    }
    if ($description !== '') {
        echo '<meta name="description" content="' . esc_attr($description) . '" />' . "\n";
        echo '<meta property="og:description" content="' . esc_attr($description) . '" />' . "\n";
    }
    if ($og_image !== '') {
        echo '<meta property="og:image" content="' . esc_url($og_image) . '" />' . "\n";
    }
}

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * I WP_DEBUG-läge: returnera HTML-kommentar för debugging.
 * I production: tom sträng.
 */
function wexoe_pages_debug_comment($msg) {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        return '<!-- ' . esc_html($msg) . ' -->';
    }
    return '';
}
