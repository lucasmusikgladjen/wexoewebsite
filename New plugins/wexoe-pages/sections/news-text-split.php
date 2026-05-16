<?php
/**
 * Section: news_text_split (section_type = "news_text_split")
 *
 * Två kolumner: textblock + "senaste-nytt"-widget.
 * Widget-källan är cms_articles (entity 'articles') — pin-then-scope:
 * nts_news_manual_ids först, fyll på med scope upp till nts_limit.
 *
 * cms_articles saknar idag country/division/topic-fält, så scope-fälten är
 * forward-looking och fungerar som no-op tills en dedikerad news-entitet
 * skapas (eller cms_articles utökas).
 */

if (!defined('ABSPATH')) exit;

return function ($section, $page, $ctx) {
    $eyebrow = (string) ($section['nts_eyebrow']  ?? '');
    $h2      = (string) ($section['nts_h2']       ?? '');
    $body    = (string) ($section['nts_body']     ?? '');
    $cta_t   = (string) ($section['nts_cta_text'] ?? '');
    $cta_u   = (string) ($section['nts_cta_url']  ?? '');
    $manual_ids = is_array($section['nts_news_manual_ids'] ?? null) ? $section['nts_news_manual_ids'] : [];
    $limit = max(0, (int) ($section['nts_limit'] ?? 3));
    if ($limit === 0) $limit = 3;

    $articles = wexoe_pages_pin_then_scope(
        $manual_ids,
        'articles',
        function () use ($limit) {
            $repo = \Wexoe\Core\Core::entity('articles');
            if ($repo === null) return [];
            $all = $repo->all(['is_active' => true]);
            // articles har ingen tidsstämpel — vi kan inte sortera "senast först".
            // Returnera oförändrad ordning från Airtable (som typiskt är skapad-ordning).
            return $all;
        },
        $limit
    );

    if ($h2 === '' && $body === '' && empty($articles)) return '';

    $wid = (string) ($ctx['wrapper_id'] ?? '');
    $attrs = wexoe_pages_section_attrs($section, $ctx, 'wxp-nts');
    ob_start();
    ?>
    <section <?= $attrs ?>>
        <div class="wxp-section__inner wxp-nts__grid">
            <div class="wxp-nts__text">
                <?php if ($eyebrow !== ''): ?><p class="wxp-eyebrow"><?= esc_html($eyebrow) ?></p><?php endif; ?>
                <?php if ($h2 !== ''): ?><h2 class="wxp-h2"><?= esc_html($h2) ?></h2><?php endif; ?>
                <?php if ($body !== ''): ?><div class="wxp-body"><?= wexoe_pages_md($body) ?></div><?php endif; ?>
                <?php if ($cta_t !== '' && $cta_u !== ''): ?>
                    <p class="wxp-nts__cta-row"><a class="wxp-btn wxp-btn--secondary" href="<?= esc_url($cta_u) ?>"><?= esc_html($cta_t) ?> <span aria-hidden="true">→</span></a></p>
                <?php endif; ?>
            </div>
            <?php if (!empty($articles)): ?>
                <aside class="wxp-nts__widget" aria-label="Senaste nytt">
                    <h3 class="wxp-nts__widget-h3">Senaste nytt</h3>
                    <ul class="wxp-nts__list">
                        <?php foreach ($articles as $a):
                            $title = (string) ($a['name'] ?? '');
                            if ($title === '') continue;
                            $link = (string) ($a['webshop_url'] ?? $a['datasheet_url'] ?? '');
                            $desc = (string) ($a['description'] ?? '');
                            $excerpt = $desc !== '' ? wp_trim_words(strip_tags($desc), 18) : '';
                        ?>
                            <li class="wxp-nts__item">
                                <?php if ($link !== ''): ?>
                                    <a href="<?= esc_url($link) ?>" class="wxp-nts__item-link"><?= esc_html($title) ?></a>
                                <?php else: ?>
                                    <span class="wxp-nts__item-title"><?= esc_html($title) ?></span>
                                <?php endif; ?>
                                <?php if ($excerpt !== ''): ?><p class="wxp-nts__item-excerpt"><?= esc_html($excerpt) ?></p><?php endif; ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </aside>
            <?php endif; ?>
        </div>
    </section>
    <style>
#<?= esc_attr($wid) ?> .wxp-nts__grid { display: grid !important; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) !important; gap: 56px !important; align-items: start !important; }
#<?= esc_attr($wid) ?> .wxp-nts__text { min-width: 0 !important; }
#<?= esc_attr($wid) ?> .wxp-nts__cta-row { margin: 24px 0 0 !important; padding: 0 !important; }
#<?= esc_attr($wid) ?> .wxp-nts__widget { padding: 24px 24px 24px 28px !important; background: #fff !important; border: 1px solid rgba(17,50,93,0.08) !important; border-left: 3px solid #F28C28 !important; border-radius: 12px !important; box-shadow: 0 4px 14px rgba(10,26,46,0.05) !important; }
#<?= esc_attr($wid) ?> .wxp-section--theme-dark .wxp-nts__widget { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.10) !important; border-left-color: #F28C28 !important; box-shadow: none !important; }
#<?= esc_attr($wid) ?> .wxp-nts__widget-h3 { font-family: 'DM Sans', system-ui, sans-serif !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; margin: 0 0 16px !important; padding: 0 !important; opacity: 0.78 !important; font-weight: 700 !important; color: inherit !important; background: none !important; }
#<?= esc_attr($wid) ?> .wxp-nts__list { list-style: none !important; padding: 0 !important; margin: 0 !important; }
#<?= esc_attr($wid) ?> .wxp-nts__item { list-style: none !important; padding: 14px 0 !important; margin: 0 !important; border-bottom: 1px solid rgba(17,50,93,0.08) !important; background: none !important; }
#<?= esc_attr($wid) ?> .wxp-nts__item::before { content: none !important; display: none !important; }
#<?= esc_attr($wid) ?> .wxp-section--theme-dark .wxp-nts__item { border-color: rgba(255,255,255,0.08) !important; }
#<?= esc_attr($wid) ?> .wxp-nts__item:last-child { border-bottom: 0 !important; padding-bottom: 0 !important; }
#<?= esc_attr($wid) ?> .wxp-nts__item:first-child { padding-top: 0 !important; }
#<?= esc_attr($wid) ?> .wxp-nts__item-link, #<?= esc_attr($wid) ?> .wxp-nts__item-title { font-family: 'DM Sans', system-ui, sans-serif !important; font-weight: 600 !important; color: inherit !important; text-decoration: none !important; display: block !important; line-height: 1.4 !important; font-size: 15px !important; }
#<?= esc_attr($wid) ?> .wxp-nts__item-link:hover { color: #F28C28 !important; }
#<?= esc_attr($wid) ?> .wxp-nts__item-excerpt { font-size: 13px !important; line-height: 1.55 !important; margin: 6px 0 0 !important; padding: 0 !important; opacity: 0.72 !important; color: inherit !important; background: none !important; }
@media (max-width: 900px) { #<?= esc_attr($wid) ?> .wxp-nts__grid { grid-template-columns: 1fr !important; gap: 32px !important; } }
    </style>
    <?php
    return ob_get_clean();
};
