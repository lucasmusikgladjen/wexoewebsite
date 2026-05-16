<?php
/**
 * Section: news_grid (section_type = "news_grid")
 *
 * Grid med artikel-kort. Datakälla: cms_articles (entity 'articles').
 * Pin-then-scope. cms_articles saknar idag country/division/topic-fält så
 * scope_*-fält fungerar som no-op tills entitet utökas.
 */

if (!defined('ABSPATH')) exit;

return function ($section, $page, $ctx) {
    $eyebrow = (string) ($section['ng_eyebrow'] ?? '');
    $h2      = (string) ($section['ng_h2']      ?? '');
    $columns = in_array(($section['ng_columns'] ?? ''), ['2', '3', '4'], true) ? (int) $section['ng_columns'] : 3;
    $limit   = max(0, (int) ($section['ng_limit'] ?? 0));
    $manual_ids = is_array($section['ng_article_manual_ids'] ?? null) ? $section['ng_article_manual_ids'] : [];

    $articles = wexoe_pages_pin_then_scope(
        $manual_ids,
        'articles',
        function () {
            $repo = \Wexoe\Core\Core::entity('articles');
            if ($repo === null) return [];
            return $repo->all(['is_active' => true]);
        },
        $limit
    );

    if (empty($articles) && $h2 === '') return '';

    $wid = (string) ($ctx['wrapper_id'] ?? '');
    $attrs = wexoe_pages_section_attrs($section, $ctx, 'wxp-ng wxp-ng--cols-' . $columns);
    ob_start();
    ?>
    <section <?= $attrs ?>>
        <div class="wxp-section__inner">
            <?php if ($eyebrow !== '' || $h2 !== ''): ?>
                <div class="wxp-ng__header">
                    <?php if ($eyebrow !== ''): ?><p class="wxp-eyebrow"><?= esc_html($eyebrow) ?></p><?php endif; ?>
                    <?php if ($h2 !== ''): ?><h2 class="wxp-h2"><?= esc_html($h2) ?></h2><?php endif; ?>
                </div>
            <?php endif; ?>
            <?php if (!empty($articles)): ?>
                <ul class="wxp-ng__grid">
                    <?php foreach ($articles as $a):
                        $title = (string) ($a['name'] ?? '');
                        if ($title === '') continue;
                        $desc = (string) ($a['description'] ?? '');
                        $image = (string) ($a['image_url'] ?? '');
                        $link = (string) ($a['webshop_url'] ?? $a['datasheet_url'] ?? '');
                    ?>
                        <li class="wxp-ng__item">
                            <?php if ($link !== ''): ?><a href="<?= esc_url($link) ?>" class="wxp-ng__card"><?php else: ?><div class="wxp-ng__card wxp-ng__card--static"><?php endif; ?>
                                <?php if ($image !== ''): ?>
                                    <div class="wxp-ng__image-wrap"><img src="<?= esc_url($image) ?>" alt="<?= esc_attr($title) ?>" class="wxp-ng__image" loading="lazy" /></div>
                                <?php else: ?>
                                    <div class="wxp-ng__image-wrap wxp-ng__image-wrap--placeholder" aria-hidden="true"></div>
                                <?php endif; ?>
                                <div class="wxp-ng__body-wrap">
                                    <h3 class="wxp-ng__title"><?= esc_html($title) ?></h3>
                                    <?php if ($desc !== ''): ?><p class="wxp-ng__desc"><?= esc_html(wp_trim_words(strip_tags($desc), 22)) ?></p><?php endif; ?>
                                    <?php if ($link !== ''): ?><span class="wxp-ng__cta">Läs mer <span aria-hidden="true">→</span></span><?php endif; ?>
                                </div>
                            <?php if ($link !== ''): ?></a><?php else: ?></div><?php endif; ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </div>
    </section>
    <style>
#<?= esc_attr($wid) ?> .wxp-ng__header { max-width: 720px !important; margin-bottom: 32px !important; }
#<?= esc_attr($wid) ?> .wxp-ng__grid { list-style: none !important; padding: 0 !important; margin: 0 !important; display: grid !important; gap: 24px !important; }
#<?= esc_attr($wid) ?> .wxp-ng--cols-2 .wxp-ng__grid { grid-template-columns: repeat(2, 1fr) !important; }
#<?= esc_attr($wid) ?> .wxp-ng--cols-3 .wxp-ng__grid { grid-template-columns: repeat(3, 1fr) !important; }
#<?= esc_attr($wid) ?> .wxp-ng--cols-4 .wxp-ng__grid { grid-template-columns: repeat(4, 1fr) !important; }
#<?= esc_attr($wid) ?> .wxp-ng__item { display: flex !important; list-style: none !important; padding: 0 !important; margin: 0 !important; background: none !important; }
#<?= esc_attr($wid) ?> .wxp-ng__item::before { content: none !important; display: none !important; }
#<?= esc_attr($wid) ?> .wxp-ng__card { display: flex !important; flex-direction: column !important; background: #fff !important; border-radius: 14px !important; overflow: hidden !important; text-decoration: none !important; color: #1A1A1A !important; border: 1px solid rgba(17,50,93,0.08) !important; box-shadow: 0 4px 16px rgba(10,26,46,0.05) !important; transition: transform 0.2s ease, box-shadow 0.2s ease !important; width: 100% !important; }
#<?= esc_attr($wid) ?> .wxp-section--theme-dark .wxp-ng__card { background: rgba(255,255,255,0.04) !important; color: #fff !important; border-color: rgba(255,255,255,0.1) !important; box-shadow: none !important; }
#<?= esc_attr($wid) ?> .wxp-ng__card:hover { transform: translateY(-3px) !important; box-shadow: 0 16px 36px rgba(10,26,46,0.10) !important; color: #1A1A1A !important; }
#<?= esc_attr($wid) ?> .wxp-section--theme-dark .wxp-ng__card:hover { color: #fff !important; }
#<?= esc_attr($wid) ?> .wxp-ng__card--static { cursor: default !important; }
#<?= esc_attr($wid) ?> .wxp-ng__image-wrap { aspect-ratio: 16 / 10 !important; overflow: hidden !important; background: #F5F6F8 !important; }
#<?= esc_attr($wid) ?> .wxp-ng__image-wrap--placeholder { background: linear-gradient(135deg, #11325D, #2d6a9f) !important; }
#<?= esc_attr($wid) ?> .wxp-ng__image { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
#<?= esc_attr($wid) ?> .wxp-ng__body-wrap { padding: 20px !important; display: flex !important; flex-direction: column !important; gap: 8px !important; flex: 1 !important; }
#<?= esc_attr($wid) ?> .wxp-ng__title { font-family: 'DM Sans', system-ui, sans-serif !important; font-size: 17px !important; margin: 0 !important; padding: 0 !important; font-weight: 700 !important; line-height: 1.3 !important; color: #11325D !important; background: none !important; }
#<?= esc_attr($wid) ?> .wxp-section--theme-dark .wxp-ng__title { color: #fff !important; }
#<?= esc_attr($wid) ?> .wxp-ng__desc { font-size: 14px !important; line-height: 1.55 !important; color: #4b5563 !important; margin: 0 !important; padding: 0 !important; background: none !important; }
#<?= esc_attr($wid) ?> .wxp-section--theme-dark .wxp-ng__desc { color: rgba(255,255,255,0.75) !important; }
#<?= esc_attr($wid) ?> .wxp-ng__cta { font-size: 14px !important; font-weight: 600 !important; color: #F28C28 !important; margin-top: auto !important; padding-top: 4px !important; }
@media (max-width: 900px) {
    #<?= esc_attr($wid) ?> .wxp-ng--cols-3 .wxp-ng__grid, #<?= esc_attr($wid) ?> .wxp-ng--cols-4 .wxp-ng__grid { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 600px) {
    #<?= esc_attr($wid) ?> .wxp-ng__grid { grid-template-columns: 1fr !important; }
}
    </style>
    <?php
    return ob_get_clean();
};
